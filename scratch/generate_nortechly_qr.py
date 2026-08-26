import os
import sys

# Ensure required libraries are installed
try:
    import qrcode
    from qrcode.image.styledpil import StyledPilImage
    from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
    from PIL import Image, ImageDraw, ImageOps
except ImportError:
    import subprocess
    print("Installing required packages (qrcode, pillow)...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "qrcode[pil]", "pillow"])
    import qrcode
    from qrcode.image.styledpil import StyledPilImage
    from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
    from PIL import Image, ImageDraw, ImageOps

def generate_nortechly_qr():
    url = "https://www.nortechly.com"
    output_dir = r"c:/Users/MARCOGALU/OneDrive/Desktop/popu-chat/public/img"
    output_path = os.path.join(output_dir, "qr_nortechly.png")
    
    print(f"Generating QR code for: {url}")
    
    # 1. Setup QR Code parameters
    qr = qrcode.QRCode(
        version=5,
        error_correction=qrcode.constants.ERROR_CORRECT_H, # High error correction (30%)
        box_size=15, # Size of each module in pixels
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    
    # 2. Generate styled QR image with rounded modules
    qr_img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer()
    ).convert('RGB')
    
    qr_w, qr_h = qr_img.size
    
    # 3. Create a custom central badge with a stylized geometric 'N' logo
    badge_size = int(qr_w * 0.25) # 25% of QR code width
    if badge_size % 2 != 0:
        badge_size += 1
        
    badge = Image.new('RGBA', (badge_size, badge_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(badge)
    
    # Draw white circle background
    draw.ellipse((0, 0, badge_size - 1, badge_size - 1), fill=(255, 255, 255, 255))
    
    # Draw thin gold border around the badge to match PopuChat's primary color (#F5CE5B)
    draw.ellipse((2, 2, badge_size - 3, badge_size - 3), outline=(245, 206, 91, 255), width=2)
    
    # Draw stylized geometric 'N' in the center in dark slate/black (#0a0f18)
    # Bounding box for the 'N' inside the circle
    padding = int(badge_size * 0.28)
    n_left = padding
    n_right = badge_size - padding
    n_top = padding
    n_bottom = badge_size - padding
    n_width = max(2, int(badge_size * 0.08))
    
    # Draw the 'N' strokes: Left bar, Right bar, Diagonal
    # Left vertical stroke
    draw.line([(n_left, n_top), (n_left, n_bottom)], fill=(10, 15, 24, 255), width=n_width)
    # Right vertical stroke
    draw.line([(n_right, n_top), (n_right, n_bottom)], fill=(10, 15, 24, 255), width=n_width)
    # Diagonal stroke
    draw.line([(n_left, n_top), (n_right, n_bottom)], fill=(10, 15, 24, 255), width=n_width)
    
    # 4. Paste the badge onto the center of the QR code
    pos_x = (qr_w - badge_size) // 2
    pos_y = (qr_h - badge_size) // 2
    
    qr_img.paste(badge, (pos_x, pos_y), badge)
    
    # 5. Save the finished image
    os.makedirs(output_dir, exist_ok=True)
    qr_img.save(output_path, "PNG")
    print(f"QR code successfully generated and saved to: {output_path}")

if __name__ == "__main__":
    generate_nortechly_qr()
