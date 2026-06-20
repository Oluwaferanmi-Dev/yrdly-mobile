import sys
from PIL import Image

def pad_to_square(img_path):
    img = Image.open(img_path)
    # Convert to RGBA to support transparency
    img = img.convert("RGBA")
    
    width, height = img.size
    max_dim = max(width, height)
    
    # Create a new transparent image with square dimensions
    new_img = Image.new("RGBA", (max_dim, max_dim), (255, 255, 255, 0))
    
    # Calculate offset to center the image
    x_offset = (max_dim - width) // 2
    y_offset = (max_dim - height) // 2
    
    # Paste the original image onto the transparent square
    new_img.paste(img, (x_offset, y_offset), img)
    
    # Save over the original
    new_img.save(img_path)
    print(f"Padded {img_path} to {max_dim}x{max_dim}")

if __name__ == "__main__":
    pad_to_square(sys.argv[1])
