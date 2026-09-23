import os
import shutil
from PIL import Image

RAW_DIR = "readme-images"
TARGET_SIDEPANEL = (1500, 1400)
TARGET_WIDESCREEN = (2900, 1640)
TARGET_OVERLAY_BADGE = (1500, 240)
TARGET_OVERLAY_POPUP = (1000, 800)

mapping = {
    # Widescreen Hero
    "Clean Ui.png": ("hero-zenith-focus.png", TARGET_WIDESCREEN),
    "Minimilist Ui.png": ("hero-problem-canvas.png", TARGET_WIDESCREEN),

    # Dashboard & Today
    "DashBoard 1.png": ("dashboard-recall-timer.png", TARGET_SIDEPANEL),
    "DashBoard 2nd.png": ("dashboard-practice-sequence.png", TARGET_SIDEPANEL),

    # Topic Mastery & Training
    "Mastery first Page.png": ("mastery-glicko2-overview.png", TARGET_SIDEPANEL),
    "Mastery 2nd Page.png": ("mastery-radar-topics.png", TARGET_SIDEPANEL),
    "Mastery 3rd page.png": ("mastery-rank-distribution.png", TARGET_SIDEPANEL),
    "Weakness.png": ("practice-training-deck.png", TARGET_SIDEPANEL),

    # Weekly Debrief
    "Weekly report 1st.png": ("weekly-velocity-rhythm.png", TARGET_SIDEPANEL),
    "Weekly report last.png": ("weekly-tactical-targets.png", TARGET_SIDEPANEL),
    "Weekly report 2nd.png": ("weekly-rating-distribution.png", TARGET_SIDEPANEL),
    "Weekly report 1st 2.0.png": ("weekly-problems-ledger.png", TARGET_SIDEPANEL),

    # Contest Ledger & Telemetry
    "Costest first page.png": ("contest-profile-trajectory.png", TARGET_SIDEPANEL),
    "Contest history.png": ("contest-history-sweeps.png", TARGET_SIDEPANEL),
    "Upcoming cost.png": ("contest-upcoming-calendar.png", TARGET_SIDEPANEL),
    "The profile telementry contest.png": ("contest-telemetry-replay.png", TARGET_SIDEPANEL),

    # Practice Tracks
    "Neetcode.png": ("track-neetcode-150.png", TARGET_SIDEPANEL),
    "NeetCode .png": ("track-striver-sde.png", TARGET_SIDEPANEL),
    "Company wise list.png": ("track-company-frequency.png", TARGET_SIDEPANEL),
    "Zerotrac list .png": ("track-zerotrac-dataset.png", TARGET_SIDEPANEL),

    # Pattern Academy & Knowledge
    "Pattern academy.png": ("learn-pattern-academy.png", TARGET_SIDEPANEL),
    "Templates.png": ("learn-code-templates.png", TARGET_SIDEPANEL),
    "Resources.png": ("learn-reference-desk.png", TARGET_SIDEPANEL),

    # Progress & Analytics
    "Rating Bands .png": ("analytics-rating-bands.png", TARGET_SIDEPANEL),
    "Activity first.png": ("analytics-productivity-review.png", TARGET_SIDEPANEL),
    "Activity 2nd.png": ("analytics-hourly-breakdown.png", TARGET_SIDEPANEL),
    "Activity 3rd.png": ("analytics-records-hall.png", TARGET_SIDEPANEL),
    "Legacy.png": ("analytics-milestones-timeline.png", TARGET_SIDEPANEL),

    # Settings
    "Setting 1.png": ("settings-preferences-sync.png", TARGET_SIDEPANEL),
    "Setting 2.png": ("settings-github-oauth.png", TARGET_SIDEPANEL),

    # In-page overlays
    "Comapy Dom Injection.png": ("in-problem-companies.png", TARGET_SIDEPANEL),
    "Timer.png": ("overlay-focus-timer.png", (1000, 800)),
    "Zerotrac ratingDom.png": ("overlay-rating-badge.png", TARGET_OVERLAY_BADGE),
}

def get_bg_color(im):
    w, h = im.size
    # Sample corners
    corners = [
        im.getpixel((0, 0)),
        im.getpixel((w - 1, 0)),
        im.getpixel((0, h - 1)),
        im.getpixel((w - 1, h - 1))
    ]
    avg_r = int(sum(c[0] for c in corners) / 4)
    avg_g = int(sum(c[1] for c in corners) / 4)
    avg_b = int(sum(c[2] for c in corners) / 4)
    return (avg_r, avg_g, avg_b, 255)

def normalize_image(src_path, dst_path, target_size):
    im = Image.open(src_path).convert("RGBA")
    w, h = im.size
    tw, th = target_size

    # Scale to fit inside target_size maintaining aspect ratio
    scale = min(tw / w, th / h)
    nw, nh = int(round(w * scale)), int(round(h * scale))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)

    # Background color
    bg = get_bg_color(im)
    canvas = Image.new("RGBA", (tw, th), bg)
    offset = ((tw - nw) // 2, (th - nh) // 2)
    canvas.paste(resized, offset, resized)
    canvas.save(dst_path, "PNG", optimize=True)
    print(f"Processed: {os.path.basename(src_path)} -> {os.path.basename(dst_path)} ({tw}x{th})")

if __name__ == "__main__":
    out_dir = "readme-images/normalized"
    os.makedirs(out_dir, exist_ok=True)
    for src_name, (dst_name, size) in mapping.items():
        src_p = os.path.join(RAW_DIR, src_name)
        dst_p = os.path.join(out_dir, dst_name)
        if os.path.exists(src_p):
            normalize_image(src_p, dst_p, size)
        else:
            print(f"NOT FOUND: {src_p}")
