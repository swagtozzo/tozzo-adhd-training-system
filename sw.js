/* Rimessa in forma: funzionamento offline.
   Per pubblicare un aggiornamento, cambia VERSION: l'app mostrerà "Aggiorna ora". */
const VERSION = "1.0";
const CACHE = "rimessa-in-forma-" + VERSION;
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./fonts/atkinson-400.woff",
  "./fonts/atkinson-700.woff",
  "./fonts/barlow-condensed-500.woff",
  "./fonts/barlow-condensed-600.woff",
  "./fonts/barlow-condensed-700.woff",
  "./img/Ball_Leg_Curl-0.jpg",
  "./img/Ball_Leg_Curl-1.jpg",
  "./img/Band_Pull_Apart-0.jpg",
  "./img/Band_Pull_Apart-1.jpg",
  "./img/Barbell_Deadlift-0.jpg",
  "./img/Barbell_Deadlift-1.jpg",
  "./img/Barbell_Hip_Thrust-0.jpg",
  "./img/Barbell_Hip_Thrust-1.jpg",
  "./img/Bent_Over_Barbell_Row-0.jpg",
  "./img/Bent_Over_Barbell_Row-1.jpg",
  "./img/Butt_Lift_Bridge-0.jpg",
  "./img/Butt_Lift_Bridge-1.jpg",
  "./img/Calf_Stretch_Hands_Against_Wall-0.jpg",
  "./img/Calf_Stretch_Hands_Against_Wall-1.jpg",
  "./img/Cat_Stretch-0.jpg",
  "./img/Cat_Stretch-1.jpg",
  "./img/Chin-Up-0.jpg",
  "./img/Chin-Up-1.jpg",
  "./img/Dumbbell_Bicep_Curl-0.jpg",
  "./img/Dumbbell_Bicep_Curl-1.jpg",
  "./img/Dumbbell_Floor_Press-0.jpg",
  "./img/Dumbbell_Floor_Press-1.jpg",
  "./img/Dumbbell_Rear_Lunge-0.jpg",
  "./img/Dumbbell_Rear_Lunge-1.jpg",
  "./img/EZ-Bar_Skullcrusher-0.jpg",
  "./img/EZ-Bar_Skullcrusher-1.jpg",
  "./img/External_Rotation_with_Band-0.jpg",
  "./img/External_Rotation_with_Band-1.jpg",
  "./img/Face_Pull-0.jpg",
  "./img/Face_Pull-1.jpg",
  "./img/Front_Squats_With_Two_Kettlebells-0.jpg",
  "./img/Front_Squats_With_Two_Kettlebells-1.jpg",
  "./img/Goblet_Squat-0.jpg",
  "./img/Goblet_Squat-1.jpg",
  "./img/Hammer_Curls-0.jpg",
  "./img/Hammer_Curls-1.jpg",
  "./img/Hanging_Leg_Raise-0.jpg",
  "./img/Hanging_Leg_Raise-1.jpg",
  "./img/Kettlebell_One-Legged_Deadlift-0.jpg",
  "./img/Kettlebell_One-Legged_Deadlift-1.jpg",
  "./img/Kneeling_Hip_Flexor-0.jpg",
  "./img/Kneeling_Hip_Flexor-1.jpg",
  "./img/Leg-Up_Hamstring_Stretch-0.jpg",
  "./img/Leg-Up_Hamstring_Stretch-1.jpg",
  "./img/One-Arm_Dumbbell_Row-0.jpg",
  "./img/One-Arm_Dumbbell_Row-1.jpg",
  "./img/Pallof_Press-0.jpg",
  "./img/Pallof_Press-1.jpg",
  "./img/Pullups-0.jpg",
  "./img/Pullups-1.jpg",
  "./img/Romanian_Deadlift-0.jpg",
  "./img/Romanian_Deadlift-1.jpg",
  "./img/Scapular_Pull-Up-0.jpg",
  "./img/Scapular_Pull-Up-1.jpg",
  "./img/Side_Bridge-0.jpg",
  "./img/Side_Bridge-1.jpg",
  "./img/Side_Lateral_Raise-0.jpg",
  "./img/Side_Lateral_Raise-1.jpg",
  "./img/Side_Neck_Stretch-0.jpg",
  "./img/Side_Neck_Stretch-1.jpg",
  "./img/Split_Squat_with_Dumbbells-0.jpg",
  "./img/Split_Squat_with_Dumbbells-1.jpg",
  "./img/Standing_Dumbbell_Calf_Raise-0.jpg",
  "./img/Standing_Dumbbell_Calf_Raise-1.jpg",
  "./img/Standing_Dumbbell_Triceps_Extension-0.jpg",
  "./img/Standing_Dumbbell_Triceps_Extension-1.jpg",
  "./img/Standing_Military_Press-0.jpg",
  "./img/Standing_Military_Press-1.jpg",
  "./img/Suspended_Push-Up-0.jpg",
  "./img/Suspended_Push-Up-1.jpg"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("rimessa-in-forma-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("message", e => { if (e.data === "skip") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => req.mode === "navigate" ? caches.match("./index.html") : Response.error()))
  );
});
