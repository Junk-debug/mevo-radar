const GBFS = "https://gbfs.urbansharing.com/rowermevo.pl";
const HDR = { "Client-Identifier": "mevo-route-planner" };
const fs = require("fs");

async function fetchJSON(endpoint) {
  const r = await fetch(`${GBFS}/${endpoint}`, { headers: HDR });
  if (!r.ok) throw new Error(`${endpoint}: ${r.status}`);
  return r.json();
}

async function main() {
  console.log("⏳ Pobieram dane stacji MEVO...");
  const [info, status] = await Promise.all([
    fetchJSON("station_information.json"),
    fetchJSON("station_status.json"),
  ]);

  const statusMap = {};
  for (const s of status.data.stations) {
    statusMap[s.station_id] = s;
  }

  const stations = info.data.stations.map((st) => {
    const s = statusMap[st.station_id] || {};
    const vt = s.vehicle_types_available || [];
    const bike = vt.find((v) => v.vehicle_type_id === "bike");
    const ebike = vt.find((v) => v.vehicle_type_id === "ebike");
    return {
      id: st.station_id,
      name: st.name,
      address: st.address,
      lat: st.lat,
      lon: st.lon,
      capacity: st.capacity,
      bikes: bike ? bike.count : 0,
      ebikes: ebike ? ebike.count : 0,
      docks: s.num_docks_available || 0,
      active: s.is_renting && s.is_returning,
    };
  });

  const data = {
    updated: new Date().toISOString(),
    count: stations.length,
    stations,
  };

  fs.writeFileSync("mevo-data.json", JSON.stringify(data, null, 2));
  console.log(`✅ Zapisano ${stations.length} stacji do mevo-data.json`);
  console.log(`📅 Czas: ${data.updated}`);

  const withBikes = stations.filter((s) => s.bikes + s.ebikes > 0).length;
  const withDocks = stations.filter((s) => s.docks > 0).length;
  console.log(`🚲 Stacje z rowerami: ${withBikes}`);
  console.log(`🅿️ Stacje z dokami: ${withDocks}`);
}

main().catch((e) => {
  console.error("❌ Błąd:", e.message);
  process.exit(1);
});
