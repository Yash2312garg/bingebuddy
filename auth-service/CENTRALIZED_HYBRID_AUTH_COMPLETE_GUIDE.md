# Centralizing Hybrid JWT + Session Auth with NGINX Gateway

## Your Current Problem

```
Main App (Port 3000)
├─ Auth Logic (OTP, JWT, Sessions)
├─ Restaurant Routes
└─ Depends on: Auth Module

Notification Service (Port 3001)
└─ ❌ No auth → Public endpoints
   OR
└─ ❌ Duplicate auth logic

Future Services (Port 3002, 3003...)
└─ ❌ Will need auth duplicated again
```

**Problems:**
- ❌ Auth logic only in one place
- ❌ Services can't share sessions
- ❌ Can't protect routes at gateway
- ❌ Adding new service = reimplement auth
- ❌ No centralized logout/permission management

---

## The Solution: Centralized Auth Service + Gateway Protection

```
┌────────────────────────────────────────────────────────────┐
│                        FRONTEND                            │
│                    (Browser/Mobile)                        │
└────────────────┬─────────────────────────────────────────┘
                 │
                 │ All requests through gateway
                 │
         ┌───────▼──────────┐
         │  NGINX Gateway   │
         │    (Port 8080)   │
         │                  │
         │ ┌──────────────┐ │
         │ │ Lua Middleware│ │  ← Validates JWT/Session
         │ │ (Auth Logic)  │ │    before routing
         │ └──────────────┘ │
         └────┬─────────────┘
              │
    ┌─────────┼─────────┬──────────────┐
    │         │         │              │
    ▼         ▼         ▼              ▼
┌────────┐┌────────┐┌────────┐  ┌────────────┐
│ Auth   ││ Main   ││Notif   │  │  Future    │
│Service ││Service ││Service │  │  Service   │
│        ││        ││        │  │            │
│3002    ││3000    ││3001    │  │  3003      │
└────────┘└────────┘└────────┘  └────────────┘

Each service receives:
- User info in headers
- Session/JWT already validated
- No auth code needed
```

---

## Architecture: Hybrid JWT + Session

### What You Currently Have

```
User Login Flow:
1. POST /login → email + OTP
2. Server generates OTP, sends via email
3. User receives OTP
4. POST /verify-otp → email + otp
5. Server validates OTP
6. Server creates SESSION in Redis (7 days TTL)
7. Server issues JWT (contains session_id, 15 min expiry)
8. Server sets HTTP-only cookie with session
   
Result:
  - Session: Persistent record in Redis (can be revoked)
  - JWT: Sent in header or cookie (for stateless verification)
  - Session_id in JWT: Links JWT to session
```

### Why This Hybrid Approach is Good

```
Benefits of BOTH:
┌──────────────────────────────┐
│  Session (in Redis)          │
├──────────────────────────────┤
│ ✅ Can revoke instantly      │
│ ✅ Can update permissions    │
│ ✅ Can track all sessions    │
│ ✅ Persistent state          │
└──────────────────────────────┘

┌──────────────────────────────┐
│  JWT (self-signed)           │
├──────────────────────────────┤
│ ✅ Can verify locally        │
│ ✅ No server lookup needed   │
│ ✅ Works offline temporarily │
│ ✅ Fast verification         │
└──────────────────────────────┘

Combined = Best of both worlds
```

---

## Complete Implementation Strategy

### Step 1: Understand the Centralized Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    1. LOGIN PHASE                           │
└─────────────────────────────────────────────────────────────┘

Frontend          NGINX         Auth Service      Redis
   │                │                │              │
   ├─POST /login────┼───────────────>│              │
   │    (email)     │                │              │
   │                │                │ Generate OTP │
   │                │                ├─────────────>│
   │                │                │ Store OTP    │
   │                │                │              │
   │                │<──── OTP ──────┤              │
   │<──── Email ────┤                │              │
   │   with OTP     │                │              │
   │                │                │              │
   ├─POST /verify-otp───────────────>│              │
   │ (email + otp)  │                │              │
   │                │                ├─Verify OTP──>│
   │                │                │<─────────────┤
   │                │                │              │
   │                │                ├─Create Session─>│
   │                │                │ session:{id}   │
   │                │                │ {user data}    │
   │                │                │ TTL: 7 days    │
   │                │                │                │
   │                │                ├─Issue JWT ────>│
   │                │                │ payload:      │
   │                │                │ {session_id}  │
   │                │                │ exp: 15min    │
   │                │                │              │
   │<───JWT + Session ID ────────────┤              │
   │                │                │              │
   │ Store in:      │                │              │
   │ - LocalStorage │                │              │
   │ - Cookie       │                │              │
```

### Step 2: Authenticated Request Flow

```
┌─────────────────────────────────────────────────────────────┐
│              2. AUTHENTICATED REQUEST PHASE                 │
└─────────────────────────────────────────────────────────────┘

Frontend          NGINX Lua       Auth Service      Services
   │                │                │              │
   ├─GET /api/data──┼─────────────────┤              │
   │ Authorization: │                 │              │
   │ Bearer JWT     │                 │              │
   │                │                 │              │
   │        ┌───────▼─────────┐       │              │
   │        │  Lua Middleware │       │              │
   │        └───────┬─────────┘       │              │
   │                │                 │              │
   │                ├─Extract JWT─────┤              │
   │                │                 │              │
   │                ├─Verify signature│              │
   │                │ (using secret)  │              │
   │                │                 │              │
   │                ├─Check expiry    │              │
   │                │                 │              │
   │                ├─Extract session_id
   │                │                 │              │
   │                ├─Validate session    ─────────>│
   │                │ (call auth-service) │          │
   │                │                 │<────────────┤
   │                │                 │ {valid:true,│
   │                │                 │  user:{...}}│
   │                │                 │              │
   │                ├─Set Headers     │              │
   │                │ X-User-ID       │              │
   │                │ X-User-Email    │              │
   │                │ X-User-Role     │              │
   │                │                 │              │
   │                ├─Route to service                ─────>│
   │                │                 │              │
   │                │                 │         ┌────▼─────┐
   │                │                 │         │ Extract  │
   │                │                 │         │ headers  │
   │                │                 │         │ req.user │
   │                │                 │         └────┬─────┘
   │                │                 │              │
   │                │                 │         Process with
   │                │                 │         user context
   │                │                 │              │
   │<──────────────────────Response───────────────────┤
   │   (200 + data) │                 │              │
   │                │                 │              │
```

### Step 3: Logout/Revocation Flow

```
┌─────────────────────────────────────────────────────────────┐
│           3. LOGOUT / SESSION REVOCATION PHASE               │
└─────────────────────────────────────────────────────────────┘

Frontend          NGINX         Auth Service      Redis
   │                │                │              │
   ├─POST /logout───┼───────────────>│              │
   │ {session_id}   │                │              │
   │                │                ├─Delete Session─>│
   │                │                │ session:{id}    │
   │                │                │<─────────────────┤
   │                │                │ Deleted         │
   │                │<───Success─────┤              │
   │<─────Logout OK─┤                │              │
   │                │                │              │
   │ Clear JWT:     │                │              │
   │ - Delete from  │                │              │
   │   localStorage │                │              │
   │ - Clear cookie │                │              │
   │                │                │              │
   ├─GET /api/data──┼───────────────>│              │
   │ Authorization: │                │              │
   │ Bearer JWT     │ ✅ JWT is valid │              │
   │                │                │              │
   │                ├─Check session  │              │
   │                │ (call auth-svc)│              │
   │                │                ├─Get session──>│
   │                │                │<─Not found────┤
   │                │                │ (deleted)     │
   │                │<───401─────────┤              │
   │<────401 Unauth─┤                │              │
   │                │                │              │
   │ Redirect to    │                │              │
   │ login page     │                │              │
```

### Step 4: Permission Update Flow

```
┌─────────────────────────────────────────────────────────────┐
│        4. DYNAMIC PERMISSION UPDATE PHASE                   │
└─────────────────────────────────────────────────────────────┘

Admin            Auth Service      Redis
  │                    │              │
  ├─Update user────────┼─────────────>│
  │ permissions        │              │
  │                    │              │
  │                ┌───▼───────────┐  │
  │                │ Update in DB  │  │
  │                └───┬───────────┘  │
  │                    │              │
  │                    ├─Get session──>│
  │                    │              │
  │                    │<─session data┤
  │                    │              │
  │                    ├─Update perms ┤
  │                    │ in session   │
  │                    │              │
  │                    ├─Update Redis─>│
  │                    │              │
  │                    │    Set TTL───>│
  │                    │    (remaining)│
  │                    │              │

User's Next Request:
Frontend          NGINX         Auth Service      Redis
   │                │                │              │
   ├─GET /protected─┼───────────────>│              │
   │ (needs new perm)
   │ Bearer JWT     │                │              │
   │                │                │              │
   │                ├─Validate JWT & │              │
   │                │ session        │              │
   │                │                │              │
   │                ├─Get session────┼─────────────>│
   │                │                │<─Updated────┤
   │                │                │ permissions  │
   │                │                │              │
   │                ├─Set Headers    │              │
   │                │ X-User-Perms:  │              │
   │                │ [new, perms]   │              │
   │                │                │              │
   │                ├─Route────────────────────────>│
   │                │              Service can now
   │                │              see new permissions
   │                │
```

---

## Implementation Architecture

### A. Auth Service Structure

```
auth-service/
│
├─ Routes
│  ├─ /login (POST) → Initiate login with email
│  ├─ /verify-otp (POST) → Verify OTP, issue JWT + create session
│  ├─ /logout (POST) → Delete session
│  ├─ /refresh (POST) → Refresh JWT token
│  ├─ /validate (POST) → Called by NGINX Lua to validate session
│  └─ /permissions (POST) → Get user permissions
│
├─ Services
│  ├─ OTPService → Generate, store, verify OTP
│  ├─ JWTService → Sign and verify JWT
│  ├─ SessionStore → Create, update, delete sessions in Redis
│  └─ PermissionService → Get user roles and permissions
│
├─ Database
│  ├─ Users table
│  ├─ User roles
│  └─ User permissions
│
└─ Dependencies
   ├─ Redis (session store)
   ├─ PostgreSQL (user data)
   └─ Email service (send OTP)
```

### B. NGINX Gateway Structure

```
nginx/
│
├─ nginx.conf
│  ├─ Upstream blocks (auth-service, main-app, notification-service)
│  │
│  ├─ Lua shared dict (JWT secret key)
│  │
│  └─ Server block (port 8080)
│     ├─ /health → Health check
│     ├─ /auth/* → Proxy to auth-service (no auth check)
│     ├─ /api/* → Protected routes
│     │  └─ Lua middleware:
│     │     1. Extract JWT from header
│     │     2. Verify JWT signature
│     │     3. Check JWT expiry
│     │     4. Call auth-service /validate
│     │     5. Set X-User-* headers
│     │     6. Route to backend service
│     │
│     └─ /* → Default to main-app
│
└─ lua/
   └─ auth.lua (optional separate file)
      ├─ JWT verification logic
      ├─ Session validation logic
      └─ Header injection
```

### C. Service Architecture (Each Service Gets Same Protection)

```
main-app/
├─ middleware/
│  └─ extractUser.ts
│     └─ Extracts user from X-User-* headers
│        (NGINX already validated)
│
└─ routes/
   ├─ /restaurant/*
   │  └─ Protected (NGINX validated first)
   │
   └─ /menu/*
      └─ Protected (NGINX validated first)

notification-service/
├─ middleware/
│  └─ extractUser.ts
│     └─ Same middleware (no duplication)
│
└─ routes/
   ├─ /notifications/*
   │  └─ Protected (NGINX validated first)
   │
   └─ /subscribe/*
      └─ Protected (NGINX validated first)
```

---

## Detailed Flow: Login to Protected Resource

### Complete User Journey

```
1. USER OPENS APP
   └─ Frontend loads (no JWT yet)

2. USER CLICKS LOGIN
   Frontend → POST http://localhost:8080/auth/login {email}
   │
   ├─ NGINX: No JWT check (auth routes are public)
   │
   └─ Proxy to → http://auth-service:3002/login
        │
        ├─ Auth Service generates OTP
        ├─ Stores OTP in Redis with TTL (5 min)
        ├─ Sends OTP via email
        │
        └─ Response: {message: "OTP sent"}

3. USER ENTERS OTP
   Frontend → POST http://localhost:8080/auth/verify-otp {email, otp}
   │
   ├─ NGINX: No JWT check (auth routes are public)
   │
   └─ Proxy to → http://auth-service:3002/verify-otp
        │
        ├─ Auth Service validates OTP
        ├─ Gets user from database
        ├─ Creates SESSION in Redis:
        │  session:abc123 = {
        │    user_id: 1,
        │    email: user@example.com,
        │    role: RESTAURANT_OWNER,
        │    permissions: [EDIT_MENU, VIEW_ORDERS],
        │    created_at: 1234567890,
        │    last_activity: 1234567890
        │  }
        │  TTL: 7 days (604800 seconds)
        │
        ├─ Issues JWT:
        │  Header: {alg: HS256, typ: JWT}
        │  Payload: {
        │    user_id: 1,
        │    email: user@example.com,
        │    session_id: abc123,
        │    role: RESTAURANT_OWNER,
        │    exp: 900 (15 min from now)
        │  }
        │  Signature: HMAC-SHA256(header.payload, secret_key)
        │
        └─ Response: {
             access_token: "eyJhbGc...",
             refresh_token: "eyJhbGc...",
             user: {id, email, role}
           }

4. FRONTEND STORES JWT
   ├─ localStorage.setItem('access_token', jwt)
   ├─ localStorage.setItem('refresh_token', jwt_refresh)
   │
   └─ Ready to make authenticated requests

5. USER MAKES FIRST API REQUEST
   Frontend → GET http://localhost:8080/api/restaurant/info
              Headers: {Authorization: "Bearer eyJhbGc..."}
   │
   ├─ NGINX receives request
   │
   ├─ Lua Middleware runs:
   │  │
   │  ├─ Extract JWT from header
   │  │  jwt = "eyJhbGc..."
   │  │
   │  ├─ Verify JWT signature:
   │  │  decoded = jwt.verify(jwt, secret_key)
   │  │  ✓ Signature is valid
   │  │  ✓ JWT created by auth-service (trusted)
   │  │
   │  ├─ Check JWT expiry:
   │  │  if decoded.exp < now:
   │  │    return 401 (JWT expired)
   │  │  ✓ JWT not expired (15 min valid)
   │  │
   │  ├─ Extract session_id from JWT:
   │  │  session_id = abc123
   │  │
   │  ├─ Call auth-service to validate session:
   │  │  POST http://auth-service:3002/validate
   │  │  {session_id: abc123}
   │  │
   │  └─ Auth Service checks Redis:
   │     if session:abc123 exists in Redis:
   │       ✓ Session is valid
   │       return {valid: true, user: {...}}
   │     else:
   │       ✗ Session deleted/expired
   │       return 401 (session not found)
   │
   ├─ If session valid, NGINX sets headers:
   │  X-User-ID: 1
   │  X-User-Email: user@example.com
   │  X-User-Role: RESTAURANT_OWNER
   │  X-User-Permissions: EDIT_MENU,VIEW_ORDERS
   │
   ├─ NGINX routes to backend service:
   │  http://main-app:3000/api/restaurant/info
   │  (forwards all headers including X-User-*)
   │
   └─ Main App receives:
      │
      ├─ extractUser middleware:
      │  req.user = {
      │    id: 1,
      │    email: user@example.com,
      │    role: RESTAURANT_OWNER,
      │    permissions: [EDIT_MENU, VIEW_ORDERS]
      │  }
      │
      ├─ Route handler runs:
      │  function getRestaurantInfo(req) {
      │    // req.user available here
      │    return db.restaurants.find(req.user.id)
      │  }
      │
      └─ Response: {name: "...", food: [...]}

6. RESPONSE GOES BACK
   Main App → Response 200 {data}
      │
      └─ NGINX forwards response
         │
         └─ Frontend receives and displays

7. USER LOGS OUT (Later)
   Frontend → POST http://localhost:8080/auth/logout
              Body: {session_id: abc123}
   │
   ├─ NGINX: No JWT check (auth route is public)
   │
   └─ Proxy to → http://auth-service:3002/logout
        │
        ├─ Auth Service deletes session from Redis:
        │  DEL session:abc123
        │
        └─ Response: {success: true}

8. USER TRIES TO USE OLD JWT
   Frontend → GET http://localhost:8080/api/restaurant/info
              Headers: {Authorization: "Bearer eyJhbGc..."}
   │
   ├─ NGINX Lua Middleware:
   │  ├─ Verify JWT signature: ✓ Valid
   │  ├─ Check JWT expiry: ✓ Not expired
   │  ├─ Call auth-service/validate with session_id
   │  │
   │  └─ Auth Service checks Redis:
   │     session:abc123 doesn't exist (was deleted)
   │     return 401 (session not found)
   │
   ├─ NGINX returns 401
   │
   └─ Frontend redirected to login page
```

---

## Key Design Decisions Explained

### Decision 1: Where Should JWT Be Validated?

```
OPTION A: Validate in Each Service
  Frontend → Service checks JWT → Service calls auth-service
  Problem: Every service needs auth logic
  Problem: Network call overhead in service code

OPTION B: Validate in NGINX (Chosen)
  Frontend → NGINX checks JWT → NGINX calls auth-service → Service
  Benefit: Single validation point
  Benefit: Services stay simple
  Benefit: Consistent auth across all services
  Benefit: Can cache validation results

✅ OPTION B IS BETTER
```

### Decision 2: Sessions or JWT Only?

```
OPTION A: JWT Only
  ❌ Can't revoke instantly
  ❌ Permission changes delayed
  ❌ Stolen token stays valid 15 min

OPTION B: Sessions Only
  ❌ Every request hits Redis (slow)
  ❌ Can't work if Redis is down

OPTION C: Hybrid (Chosen)
  ✅ JWT for fast verification
  ✅ Sessions for revocation/permissions
  ✅ Best of both worlds

✅ OPTION C IS BETTER
```

### Decision 3: Short or Long JWT Expiry?

```
SHORT JWT (15 minutes):
  ✅ If stolen, attacker has limited time
  ✅ Permission changes take effect in 15 min
  ❌ User needs to refresh frequently
  ❌ More refresh calls to auth-service

LONG JWT (24 hours):
  ✅ User doesn't need to refresh often
  ❌ If stolen, attacker has long access
  ❌ Permission changes take 24 hours
  ❌ Logout doesn't work instantly for long-running requests

✅ SHORT IS BETTER (15-30 min)
  Trade: More refresh calls
  Gain: Better security + permission freshness
```

### Decision 4: Where to Store JWT?

```
OPTION A: localStorage
  ✅ Can access in JavaScript
  ❌ Vulnerable to XSS (JavaScript can steal)
  ❌ Persists after browser close (security risk)

OPTION B: Cookie (HTTP-only)
  ✅ Can't be accessed by JavaScript (XSS safe)
  ✅ Automatically sent by browser
  ✅ Can set Secure flag (HTTPS only)
  ❌ Vulnerable to CSRF (use SameSite flag)

OPTION C: Both (localStorage + Cookie)
  ✅ Best user experience
  ✅ Best security
  Approach: Store JWT in both for flexibility

✅ OPTION C IS BEST
  Set HttpOnly cookie for auto-sent requests
  Also store in localStorage for SPA redirect logic
```

---

## Session vs JWT Comparison in This Architecture

### How Sessions Work

```
Session exists in Redis:
session:abc123 = {
  user_id: 1,
  email: user@example.com,
  role: RESTAURANT_OWNER,
  permissions: [EDIT_MENU, VIEW_ORDERS],
  created_at: 1234567890,
  last_activity: 1234567890,
  ip_address: 192.168.1.1,
  device_id: chrome-123
}

Every request checks session:
  1. Extract session_id from JWT
  2. Query Redis: GET session:{session_id}
  3. If exists: ✅ Valid, use session data
  4. If not exists: ❌ Invalid, reject request

Logout:
  1. Delete session from Redis: DEL session:{session_id}
  2. Old JWT becomes useless (session gone)
  3. Next request fails

Permission change:
  1. Update session in Redis
  2. Next request sees new permissions
```

### How JWT Works

```
JWT contains:
{
  user_id: 1,
  email: user@example.com,
  session_id: abc123,
  role: RESTAURANT_OWNER,
  exp: 1234567890 (timestamp when JWT expires)
}

Every request validates JWT:
  1. Extract JWT from header
  2. Verify signature (using secret key)
  3. Check expiry: if exp < now: rejected
  4. If valid: Extract user data from JWT

Logout:
  1. Session deleted from Redis
  2. JWT still valid until exp
  3. But session_id lookup fails

Permission change:
  1. Update session in Redis
  2. But JWT still has old permissions
  3. Session lookup returns new permissions
  4. Use session data (most current)
```

### The Hybrid Advantage

```
Request validation:
  1. Verify JWT signature (fast, local)
  2. Check JWT expiry (fast, local)
  3. Extract session_id from JWT
  4. Look up session in Redis (validate + get fresh permissions)
  5. Use session data for actual permissions

Result:
  ✅ Fast JWT verification (1-5ms)
  ✅ Can revoke immediately (delete session)
  ✅ Permissions always fresh (from session)
  ✅ Can track session info (IP, device, etc.)
```

---

## Implementation Strategy for Your Stack

### Phase 1: Extract Auth Service (2 days)

```
Current state: Auth logic in main-app

Action 1: Create auth-service/
  ├─ Move login, verify-otp, logout logic
  ├─ Move JWT signing/verification
  ├─ Move session management
  └─ Create /validate endpoint (for gateway)

Action 2: Update docker-compose.yml
  ├─ Add auth-service container
  ├─ Connect to Redis
  ├─ Connect to PostgreSQL

Action 3: Test auth-service independently
  ├─ /login → generates OTP
  ├─ /verify-otp → issues JWT + creates session
  ├─ /logout → deletes session
  ├─ /validate → validates session
```

### Phase 2: Add NGINX Gateway (1 day)

```
Current state: No NGINX gateway

Action 1: Create nginx/ directory
  ├─ Write nginx.conf with Lua middleware
  ├─ Define upstreams (auth, main, notification)
  ├─ Add Lua auth validation logic

Action 2: Update docker-compose.yml
  ├─ Add nginx service
  ├─ Map port 8080 to NGINX
  ├─ Set depends_on services

Action 3: Test gateway
  ├─ Login through NGINX: ✓
  ├─ JWT validation in NGINX: ✓
  ├─ Route to services: ✓
```

### Phase 3: Update Services (1 day each)

```
For each service (main-app, notification-service):

Action 1: Add extractUser middleware
  ├─ Read X-User-* headers (set by NGINX)
  ├─ Populate req.user

Action 2: Remove old auth logic
  ├─ Delete duplicate JWT verification
  ├─ Delete duplicate session checks
  ├─ Delete duplicate OTP logic

Action 3: Update routes
  ├─ Add extractUser to protected routes
  ├─ Use req.user (already validated)

Action 4: Test with NGINX
  ├─ Make authenticated request through gateway
  ├─ Verify req.user populated correctly
```

### Phase 4: Add to Future Services (1 day)

```
When adding new service:

Action 1: Create service (same structure)
  └─ Include extractUser middleware (copy from main-app)

Action 2: Update NGINX config
  ├─ Add upstream for new service
  ├─ Add location rule to route to new service

Action 3: Done!
  └─ No auth code needed (gateway handles it)
```

---

## Sample NGINX Configuration

```nginx
http {
  # JWT secret (load from env or secrets)
  lua_shared_dict jwt_key 1m;
  
  init_by_lua_block {
    local secret = os.getenv("JWT_SECRET") or "your-secret-key"
    ngx.shared.jwt_key:set("secret", secret)
  }

  upstream auth_service {
    server auth-service:3002;
    keepalive 32;
  }

  upstream main_app {
    server app-dev:3000;
    keepalive 32;
  }

  upstream notification_svc {
    server notification-service-dev:3001;
    keepalive 16;
  }

  server {
    listen 8080;
    
    # Health check
    location = /health {
      return 200 '{"status":"ok"}';
    }

    # Auth routes (NO validation)
    location ~ ^/auth/(login|verify-otp|logout|refresh)$ {
      proxy_pass http://auth_service;
    }

    # Protected API routes
    location ~ ^/api/ {
      access_by_lua_block {
        -- Extract JWT from header
        local token = ngx.var.http_authorization
        if not token then
          return ngx.HTTP_UNAUTHORIZED
        end
        
        token = string.sub(token, 8) -- Remove "Bearer "
        
        -- Verify JWT signature
        local jwt = require("resty.jwt")
        local secret = ngx.shared.jwt_key:get("secret")
        local decoded, err = jwt:verify(secret, token)
        
        if not decoded then
          return ngx.HTTP_UNAUTHORIZED
        end
        
        -- Check expiry
        if decoded.exp < ngx.time() then
          return ngx.HTTP_UNAUTHORIZED
        end
        
        -- Validate session with auth-service
        -- (would call /validate endpoint)
        
        -- Set user headers
        ngx.var.user_id = decoded.user_id
        ngx.var.user_email = decoded.email
        ngx.var.user_role = decoded.role
      }
      
      proxy_set_header X-User-ID $user_id;
      proxy_set_header X-User-Email $user_email;
      proxy_set_header X-User-Role $user_role;
      
      # Route based on path
      if ($uri ~ "^/api/notification") {
        proxy_pass http://notification_svc;
      }
      proxy_pass http://main_app;
    }

    # Default route
    location / {
      proxy_pass http://main_app;
    }
  }
}
```

---

## Benefits of This Approach

### For Developers

```
✅ No auth code duplication
   - Auth logic once in auth-service
   - All services use same validation
   
✅ Simple service code
   - Just read req.user from headers
   - No JWT verification needed
   
✅ Easy to add new services
   - Copy extractUser middleware
   - Update NGINX config
   - Done!
   
✅ Consistent auth across stack
   - Same rules everywhere
   - Same permission format
   - Same session management
```

### For Operations

```
✅ Centralized control
   - Change auth logic in one place
   - Affects all services immediately
   
✅ Easy to monitor
   - All auth requests go through NGINX
   - Can log all authentications
   - Can see which users logged in when
   
✅ Easy to rollback
   - Change auth-service version
   - Rollback affects all services
   
✅ Scale horizontally
   - Add more NGINX instances
   - Add more service instances
   - All work together seamlessly
```

### For Security

```
✅ Single validation point
   - NGINX validates before services
   - Malicious requests blocked early
   
✅ Centralized revocation
   - Logout in auth-service
   - Takes effect across all services
   
✅ Permission management
   - Change permissions once
   - Apply to all services
   
✅ Audit trail
   - All auth events logged
   - Know who accessed what when
```

---

## What Happens at Scale

```
With 100k requests/second:

Current architecture (auth in service):
  Service 1: Auth logic in request path
  Service 2: Auth logic in request path (duplicated)
  Service 3: Auth logic in request path (duplicated)
  Result: 3x auth processing, 3x Redis calls

With centralized auth:
  NGINX: Single validation point
  Services: No auth overhead
  
Result: Auth validated once, routed to service
  1 Redis check (not 3)
  1 JWT verification (not 3)
  Reduces latency significantly
```

