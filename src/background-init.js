console.log("bg-init");

// This file handeles the initalization of the background script
import { init } from "./background";

init().catch((error) => {
  throw error;
});
