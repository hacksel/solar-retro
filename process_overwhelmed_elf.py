#!/usr/bin/env python3
from PIL import Image
import sys

def remove_white_background(input_path, output_path, tolerance=60):
    """Remove white/light background from an image"""
    img = Image.open(input_path)
    img = img.convert("RGBA")
    
    data = img.getdata()
    
    # Get the top-left pixel as reference for background color
    bg_color = data[0][:3]
    
    new_data = []
    for item in data:
        # Calculate color distance from background
        r_diff = abs(item[0] - bg_color[0])
        g_diff = abs(item[1] - bg_color[1])
        b_diff = abs(item[2] - bg_color[2])
        
        # If pixel is close to background color, make it transparent
        if r_diff < tolerance and g_diff < tolerance and b_diff < tolerance:
            new_data.append((255, 255, 255, 0))  # Transparent
        else:
            new_data.append(item)
    
    img.putdata(new_data)
    img.save(output_path, "PNG")
    print(f"Processed {output_path} with tolerance {tolerance}")

if __name__ == "__main__":
    input_file = "/Users/axelagarrat/.gemini/antigravity/brain/251510d9-e831-4515-b8cb-47ad8b0c5d03/uploaded_image_1765988550549.jpg"
    output_file = "frontend/public/elf-overwhelmed.png"
    
    remove_white_background(input_file, output_file, tolerance=70)
