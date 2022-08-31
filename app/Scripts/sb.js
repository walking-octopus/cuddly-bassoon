// ==UserScript==
// @name         sb_mobile.js userscript
// @description  A (mobile) YouTube SponsorBlock userscript
// @namespace    mchang.name
// @icon         https://mchangrh.github.io/sb.js/icon.png
// @version      1.0.1
// ==/UserScript==

// I rewrite portions of the original scripts to work with m.youtube.com.
// I warned you that it's filled with hacks! :D

let video, videoID, skipSegments, muteSegments, muteEndTime, videoLabel;

/* START OF SETTINGS */
// https://wiki.sponsor.ajay.app/w/Types
const categories = [
  "sponsor",
  "selfpromo",
  "interaction",
  "intro",
  "outro",
  "preview",
  "music_offtopic",
  "exclusive_access"
]
const actionTypes = [
  "skip",
  "mute",
  "full"
]
const skipThreshold = [0.2, 1] // skip from between time-[0] and time+[1]
const serverEndpoint = "https://sponsor.ajay.app"
/* END OF SETTINGS */

// A weird ritual that adds the event listeners.
updateVideoElement = setInterval(() => {
  let videoElement = document.querySelector("video");
  if (!videoElement) { return }
  video = videoElement;

  // FIXME: Figure out how to make this less hacky without angering the DOM gods.
  // Somehow the element sometimes disapears and reapears without the event listener.
  // clearInterval(updateVideoElement)
  
  if (videoElement.getAttribute('eventListenerAdded') == 'true') { return }
  reset();

  console.log("[sb] Setting up event listeners")
  videoElement.addEventListener('loadeddata', onVideoChanged);
  videoElement.addEventListener('timeupdate', onTimeUpdate);

  videoElement.setAttribute('eventListenerAdded', 'true');
}, 500);

// Handlers
async function onVideoChanged() {
  let videoId = getVideoID()
  console.log(`[sb]: Now playing ${videoId}`);

  // TODO: Add segment fetching
  const url = `${serverEndpoint}/api/skipSegments?videoID=${videoId}&categories=${JSON.stringify(categories)}&actionTypes=${JSON.stringify(actionTypes)}`;
  console.log("[sb] Fetching segments: " + url)

  // TODO: Handle rejected promises
  let response = await fetch(url);
  let segmentsData = await response.json();

  skipSegments = new Map(segmentsData
    .filter((s) => s.actionType === "skip")
    .map((s) => [s.segment[0], { end: s.segment[1], uuid: s.UUID }])
  );
  muteSegments = new Map(segmentsData
    .filter((segment) => segment.actionType === "mute")
    .map((s) => [s.segment[0], { end: s.segment[1], uuid: s.UUID }])
  );

  // TODO: Add colored indicators for sponsored segments
}

function onTimeUpdate() {
  if (typeof video == "undefined") {
    console.log("[sb]: Failed to get video element. If this error is printed once, it's just a weird race condition. If not, something had gone very wrong with the code.")
    return
  } 

  const currentTime = video.currentTime;
  // console.log(`[sb]: Current time is ${currentTime}`);

  if (video.muted && currentTime >= muteEndTime) {
    video.muted = false;
    muteEndTime = 0;
  }
  // Check for any skip starts
  const skipEnd = findEndTime(currentTime, skipSegments);
  if (skipEnd) video.currentTime = skipEnd;

  // Check for any mute starts
  const muteEnd = findEndTime(currentTime, muteSegments);
  if (muteEnd) {
    video.muted = true;
    muteEndTime = muteEnd;
  }

  // TODO: Add a fancy toast notification for skipped segments
  // Maybe I can hijack an official snackbar?
}

// Utility functions
function findEndTime(now, map) {
  let endTime = null;
  for (const startTime of map.keys()) {
    if (
      now + skipThreshold[0] >= startTime &&
      now - startTime <= skipThreshold[1]
    ) {
      const segment = map.get(startTime);
      endTime = segment.end;
      trackSkip(segment.uuid);
      map.delete(startTime); // only use segment once
      for (const overlapStart of map.keys()) {
        // Check for overlap
        if (endTime >= overlapStart && overlapStart >= now) {
          // Overlapping segment
          const overSegment = map.get(overlapStart);
          endTime = overSegment.end;
          trackSkip(overSegment.uuid)
          map.delete(overlapStart);
        }
      }
      return endTime; // Rarly return
    }
  }
  return endTime;
}

const reset = () => {
  video = undefined;
  videoID = undefined;
  muteEndTime = 0;
  videoLabel = undefined;
  skipSegments = [];
  muteSegments = [];
};

const getVideoID = () => new URL(window.location.href).searchParams.get("v");
// const log = (value) => console.log(`[sb] ${value}`)