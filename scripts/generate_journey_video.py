import os
import cv2
import numpy as np
import imageio_ffmpeg
import subprocess

def create_fast_cinematic_journey_video():
    width = 1280
    height = 720
    fps = 30
    
    # 1.6x Fast-Paced Scene Durations (Total ~25s punchy commercial)
    scenes = [
        # Scene 1: Welcome to GrocerAI - Doors Open
        {
            'path': 'public/movie/scene-01-doors-open.jpg',
            'duration_sec': 3.2,
            'zoom': (1.0, 1.08),
            'pan': (0, 0, 0, -10),
            'special': 'doors_open'
        },
        # Scene 2: Person goes to digital kiosk & interacts
        {
            'path': 'public/movie/scene-02-kiosk-interact.jpg',
            'duration_sec': 3.2,
            'zoom': (1.02, 1.10),
            'pan': (0, 0, 10, -6),
            'special': None
        },
        # Scene 3: Mobile shopping starts & Customer Agent voice interaction
        {
            'path': 'public/movie/scene1-walk-phone.jpg',
            'duration_sec': 3.2,
            'zoom': (1.0, 1.07),
            'pan': (-6, 0, 6, -6),
            'special': None
        },
        # Scene 4: Reaches shelf for Organic Pasta in Aisle 3
        {
            'path': 'public/movie/scene2-reach-shelf.jpg',
            'duration_sec': 2.8,
            'zoom': (1.0, 1.09),
            'pan': (0, 0, 0, -10),
            'special': None
        },
        # Scene 5: Places item into shopping cart
        {
            'path': 'public/movie/scene3-place-cart.jpg',
            'duration_sec': 2.8,
            'zoom': (1.01, 1.08),
            'pan': (5, 0, -5, -5),
            'special': None
        },
        # Scene 6: Continues shopping down the aisle
        {
            'path': 'public/movie/scene4-continue-walk.jpg',
            'duration_sec': 2.8,
            'zoom': (1.0, 1.07),
            'pan': (0, 0, 10, 0),
            'special': None
        },
        # Scene 7: Comes back to kiosk, completes checkout & verification
        {
            'path': 'public/movie/scene-07-kiosk-checkout.jpg',
            'duration_sec': 3.8,
            'zoom': (1.0, 1.09),
            'pan': (0, 0, 0, -8),
            'special': 'cv_scan'
        },
        # Scene 8: Exits store, automatic doors closing
        {
            'path': 'public/movie/scene-08-doors-close.jpg',
            'duration_sec': 3.4,
            'zoom': (1.06, 1.0),
            'pan': (0, -8, 0, 8),
            'special': 'doors_close'
        }
    ]

    temp_raw_avi = 'scratch/raw_journey_fast.avi'
    out_mp4 = 'public/movie/grocerai-journey.mp4'
    os.makedirs('scratch', exist_ok=True)
    os.makedirs('public/movie', exist_ok=True)

    fourcc = cv2.VideoWriter_fourcc(*'MJPG')
    writer = cv2.VideoWriter(temp_raw_avi, fourcc, fps, (width, height))

    total_frames = sum(int(s['duration_sec'] * fps) for s in scenes)
    print(f"Generating fast-paced video ({len(scenes)} scenes, {total_frames} frames, {total_frames/fps:.1f}s)...")

    loaded_images = []
    for s in scenes:
        img = cv2.imread(s['path'])
        if img is None:
            raise FileNotFoundError(f"Missing image: {s['path']}")
        img_resized = cv2.resize(img, (width, height), interpolation=cv2.INTER_LANCZOS4)
        loaded_images.append(img_resized)

    def get_motion_frame(img, progress, zoom_range, pan_range):
        z_start, z_end = zoom_range
        zoom = z_start + (z_end - z_start) * progress
        
        px_start, py_start, px_end, py_end = pan_range
        pan_x = px_start + (px_end - px_start) * progress
        pan_y = py_start + (py_end - py_start) * progress

        zw = int(width / zoom)
        zh = int(height / zoom)

        cx = width / 2.0 + pan_x
        cy = height / 2.0 + pan_y

        x1 = int(np.clip(cx - zw / 2.0, 0, width - zw))
        y1 = int(np.clip(cy - zh / 2.0, 0, height - zh))
        x2 = x1 + zw
        y2 = y1 + zh

        crop = img[y1:y2, x1:x2]
        return cv2.resize(crop, (width, height), interpolation=cv2.INTER_LINEAR)

    global_frame = 0

    for idx, s in enumerate(scenes):
        img_current = loaded_images[idx]
        scene_frames = int(s['duration_sec'] * fps)
        transition_frames = 10  # ~0.33s brisk cross-dissolve

        for f in range(scene_frames):
            prog = f / float(scene_frames)
            frame = get_motion_frame(img_current, prog, s['zoom'], s['pan'])

            # Brisk Cross-Dissolve into next scene
            if f >= scene_frames - transition_frames and idx < len(scenes) - 1:
                t_prog = (f - (scene_frames - transition_frames)) / float(transition_frames)
                next_img = loaded_images[idx + 1]
                next_frame = get_motion_frame(next_img, 0.0, scenes[idx + 1]['zoom'], scenes[idx + 1]['pan'])
                frame = cv2.addWeighted(frame, 1.0 - t_prog, next_frame, t_prog, 0)

            # 1. Door opening effect on Scene 1
            if s['special'] == 'doors_open' and f < 30:
                door_prog = min(1.0, f / 30.0)
                door_offset = int((width // 2) * door_prog)
                left_edge = (width // 2) - door_offset
                if left_edge > 0:
                    overlay = frame.copy()
                    cv2.rectangle(overlay, (0, 0), (left_edge, height), (20, 28, 36), -1)
                    cv2.line(overlay, (left_edge, 0), (left_edge, height), (16, 185, 129), 3)
                    frame = cv2.addWeighted(frame, door_prog, overlay, 1.0 - door_prog, 0)
                right_edge = (width // 2) + door_offset
                if right_edge < width:
                    overlay = frame.copy()
                    cv2.rectangle(overlay, (right_edge, 0), (width, height), (20, 28, 36), -1)
                    cv2.line(overlay, (right_edge, 0), (right_edge, height), (16, 185, 129), 3)
                    frame = cv2.addWeighted(frame, door_prog, overlay, 1.0 - door_prog, 0)

            # 2. CV Scan laser grid on Checkout Kiosk
            if s['special'] == 'cv_scan':
                scan_y = int(220 + 320 * (0.5 + 0.5 * np.sin(f * 0.28)))
                overlay = frame.copy()
                cv2.line(overlay, (240, scan_y), (820, scan_y), (0, 255, 120), 3)
                for gx in range(260, 800, 35):
                    cv2.line(overlay, (gx, scan_y - 20), (gx, scan_y + 20), (0, 255, 150), 1)
                cv2.rectangle(overlay, (240, scan_y - 12), (820, scan_y + 12), (0, 255, 100), -1)
                frame = cv2.addWeighted(frame, 0.8, overlay, 0.2, 0)

            # 3. Door closing effect on Scene 8
            if s['special'] == 'doors_close' and f > scene_frames - 35:
                close_prog = (f - (scene_frames - 35)) / 30.0
                close_prog = min(1.0, max(0.0, close_prog))
                door_w = int((width // 2) * close_prog)
                if door_w > 0:
                    overlay = frame.copy()
                    cv2.rectangle(overlay, (0, 0), (door_w, height), (15, 20, 28), -1)
                    cv2.line(overlay, (door_w, 0), (door_w, height), (16, 185, 129), 3)
                    cv2.rectangle(overlay, (width - door_w, 0), (width, height), (15, 20, 28), -1)
                    cv2.line(overlay, (width - door_w, 0), (width - door_w, height), (16, 185, 129), 3)
                    frame = cv2.addWeighted(frame, 1.0 - close_prog * 0.85, overlay, close_prog * 0.85, 0)

            # Subtle cinematic vignette
            grad_h = 70
            top_grad = np.tile(np.linspace(0.5, 0.0, grad_h)[:, None, None], (1, width, 3))
            frame[:grad_h] = (frame[:grad_h] * (1.0 - top_grad)).astype(np.uint8)

            bot_grad = np.tile(np.linspace(0.0, 0.6, 90)[:, None, None], (1, width, 3))
            frame[height - 90:] = (frame[height - 90:] * (1.0 - bot_grad)).astype(np.uint8)

            writer.write(frame)
            global_frame += 1

    writer.release()
    print(f"Raw fast frames written ({global_frame}). Transcoding with libx264...")

    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [
        ffmpeg_exe,
        '-y',
        '-i', temp_raw_avi,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'high',
        '-level', '4.0',
        '-crf', '19',
        '-preset', 'fast',
        '-movflags', '+faststart',
        out_mp4
    ]
    subprocess.run(cmd, check=True)
    if os.path.exists(temp_raw_avi):
        os.remove(temp_raw_avi)
    print(f"Done! Fast-paced movie created at {out_mp4} ({os.path.getsize(out_mp4)/1024/1024:.2f} MB)")

if __name__ == '__main__':
    create_fast_cinematic_journey_video()
