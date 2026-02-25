import os
import pandas as pd
from PIL import Image, ImageDraw, ImageFont
import config

def get_font(font_path, text, max_width, max_height, initial_size):
    """
    Dynamically scales down the font size so that the text fits within max_width and max_height.
    """
    fontsize = initial_size
    font = ImageFont.truetype(font_path, fontsize)
    
    # Decrease font size until it fits both the max width and max height
    while True:
        # getbbox returns (left, top, right, bottom)
        bbox = font.getbbox(text)
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]
        if (width <= max_width and height <= max_height) or fontsize <= 10:
            break
        fontsize -= 2
        font = ImageFont.truetype(font_path, fontsize)
        
    return font

def generate_certificates():
    if not os.path.exists(config.OUTPUT_DIR):
        os.makedirs(config.OUTPUT_DIR)
        
    if not os.path.exists(config.FONT_PATH):
        print(f"Error: Font file not found at {config.FONT_PATH}. Please ensure it is present.")
        return

    try:
        df = pd.read_csv(config.INPUT_CSV)
    except FileNotFoundError:
        print(f"Error: Could not find {config.INPUT_CSV}")
        return

    print(f"Found {len(df)} participants. Starting generation...")

    for index, row in df.iterrows():
        name = str(row['name'])
        email = str(row['email'])
        
        # Load the template image
        img = Image.open(config.TEMPLATE_IMAGE).convert("RGB")
        draw = ImageDraw.Draw(img)
        
        # Get the dynamically scaled font to fit within the box width and height
        font = get_font(config.FONT_PATH, name, config.BBOX_WIDTH, config.BBOX_HEIGHT, config.MAX_FONT_SIZE)
        
        # Calculate text width/height for centering
        bbox = font.getbbox(name)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Adjust X and Y to center the text exactly within the bounding box
        center_x = config.BBOX_X + (config.BBOX_WIDTH / 2)
        center_y = config.BBOX_Y + (config.BBOX_HEIGHT / 2)
        
        adjusted_x = center_x - (text_width / 2)
        adjusted_y = center_y - (text_height / 2)
        
        draw.text((adjusted_x, adjusted_y), name, fill=config.TEXT_COLOR, font=font)
        
        # Save as PDF
        # We generate the filename based on the email to make it easy for the mailer to find
        safe_email = email.replace('@', '_at_').replace('.', '_dot_')
        output_filename = f"certificate_{safe_email}.pdf"
        output_path = os.path.join(config.OUTPUT_DIR, output_filename)
        
        img.save(output_path, "PDF", resolution=100.0)
        print(f"Generated certificate for {name} -> {output_path}")

    print("Generation complete!")

if __name__ == "__main__":
    generate_certificates()
