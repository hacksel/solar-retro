
from PIL import Image
import os
import glob

def remove_black_background(image_path):
    print(f"Processing {image_path}...")
    try:
        img = Image.open(image_path).convert("RGBA")
        datas = img.getdata()
        
        new_data = []
        for item in datas:
            # Change all black (also shades of blacks) 
            # to transparent
            if item[0] < 50 and item[1] < 50 and item[2] < 50:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
        
        img.putdata(new_data)
        img.save(image_path, "PNG")
        print(f"Saved {image_path}")
    except Exception as e:
        print(f"Failed to process {image_path}: {e}")

# Process specific files
files = [
    "ornament-gold.png",
    "ornament-black.png",
    "gift-box.png",
    "star-topper.png",
    "tree-real.png" # Also try to clean up tree edges
]

for f in files:
    path = os.path.join("public", f)
    if os.path.exists(path):
        remove_black_background(path)
