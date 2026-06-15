// src/scripts/load-test.ts

// Hits port 8000 mapped by your app-dev docker service container
const TARGET_URL = "http://localhost:8000/api/v1/notifications/trigger";
const TOTAL_REQUESTS = 12000; 

async function fireNotification(index: number): Promise<void> {
  // Input parameters are camelCase to satisfy your express route validations
  const payload = {
    recipientId: "THEG-NSAD",       // Matches frontend hook parameter exactly
    recipientType: "RESTAURANT",   // Matches frontend hook parameter exactly
    eventType: "IN_APP",           // Routes to Postgres + SSE PubSub pipeline
    title: `Concurrent Burst Alert #${index}`,
    message: `Automated load balancing verification payload stack index: ${index}`,
    priority: index % 3 === 0 ? "HIGH" : "LOW", 
  };

  try {
    const response = await fetch(TARGET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log(`🚀 [Load Gen] Dispatched Event #${index} successfully.`);
    } else {
      console.error(`❌ [Load Gen] Server Rejected Event #${index} | Status: ${response.status}`);
    }
  } catch (error: any) {
    console.error(`💥 [Load Gen] Network execution barrier on Event #${index}:`, error.message);
  }
}

async function runLoadTest() {
  console.log(`🏋️  Starting Live Load Test: Bombarding API with ${TOTAL_REQUESTS} parallel requests...`);
  const startTime = Date.now();

  // Create an array of concurrent fetch execution blocks
  const requests = Array.from({ length: TOTAL_REQUESTS }, (_, i) => fireNotification(i + 1));

  // Flood the Express API gateway simultaneously 
  await Promise.all(requests);

  const duration = Date.now() - startTime;
  console.log(`🏁 Load Test Completed! Fired ${TOTAL_REQUESTS} requests in ${duration}ms.`);
}

runLoadTest();