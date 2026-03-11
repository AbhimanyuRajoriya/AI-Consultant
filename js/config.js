window.API_BASE =
  window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
    ? "http://127.0.0.1:8000"
    : "http://ec2-32-192-188-153.compute-1.amazonaws.com:8000";