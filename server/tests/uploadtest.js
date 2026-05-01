import http from "k6/http";
import { check, sleep } from "k6";

// ---- Init stage (runs once globally) ----
let fileData;
let filename = "testfile.jpeg"; // or change to .jpg depending on your actual file

try {
  fileData = open(`./${filename}`, "b");
} catch (err) {
  console.error(`❌ Could not load file ${filename}:`, err.message);
  throw err; // stop test if file is missing
}

export let options = {
  vus: 10,
  duration: "30s",
};

// ---- VU execution stage ----
export default function () {
  const url = "http://localhost:3000/uploads";

  // construct multipart payload
  const payload = {
    file: http.file(fileData, filename, "image/jpeg"),
  };

  let res = http.post(url, payload);

  // ---- Assertions ----
  check(res, {
    "status is 200": (r) => r.status === 200,
    "response has filename": (r) => {
      try {
        return r.json("filename") !== undefined;
      } catch (_) {
        return false;
      }
    },
  });

  sleep(1);
}
