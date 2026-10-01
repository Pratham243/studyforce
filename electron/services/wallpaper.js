// Desktop wallpaper swap for the shame screen. Works on Windows and macOS;
// on Linux it depends on the desktop environment, so every call is best-effort.

const load = () => import('wallpaper');

async function getWallpaper() {
  try {
    const { getWallpaper } = await load();
    return await getWallpaper();
  } catch {
    return null;
  }
}

async function setWallpaper(file) {
  try {
    const { setWallpaper } = await load();
    await setWallpaper(file);
    return true;
  } catch (e) {
    console.warn('[wallpaper] could not set wallpaper:', e.message);
    return false;
  }
}

module.exports = { getWallpaper, setWallpaper };
