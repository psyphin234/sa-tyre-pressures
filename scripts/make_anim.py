import sys, os
from PIL import Image
# The owner's deflating-tyre animation (Pics/deflate.gif, not committed) as an
# animated WebP for the site, plus a still of the last frame for visitors who
# prefer reduced motion.
proj = sys.argv[1]
src = Image.open(os.path.join(proj, "Pics", "deflate.gif"))
W = 720
frames, durations = [], []
for i in range(src.n_frames):
    src.seek(i)
    f = src.convert("RGB")
    f = f.resize((W, round(f.height * W / f.width)), Image.LANCZOS)
    frames.append(f)
    durations.append(src.info.get("duration", 50))
out = os.path.join(proj, "img", "deflate.webp")
frames[0].save(out, save_all=True, append_images=frames[1:], duration=durations, loop=0, quality=72, method=6)
frames[-1].save(os.path.join(proj, "img", "deflate-still.jpg"), quality=80, optimize=True)
print("webp", os.path.getsize(out) // 1024, "KB,", len(frames), "frames,", frames[0].size)
