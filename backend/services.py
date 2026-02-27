import io
from PIL import Image, ImageDraw, ImageFont

def get_font(font_bytes: bytes, text: str, max_width: int, max_height: int, initial_size: int):
    """
    Dynamically scales down the font size so that the text fits within max_width and max_height.
    font_bytes is the raw TrueType font file content in memory.
    """
    fontsize = initial_size
    font_stream = io.BytesIO(font_bytes)
    font = ImageFont.truetype(font_stream, fontsize)
    
    while True:
        bbox = font.getbbox(text)
        width = bbox[2] - bbox[0]
        height = bbox[3] - bbox[1]
        if (width <= max_width and height <= max_height) or fontsize <= 10:
            break
        fontsize -= 2
        
        # Need to re-seek the stream for ImageFont to read it again
        font_stream.seek(0)
        font = ImageFont.truetype(font_stream, fontsize)
        
    return font

def generate_preview(template_bytes: bytes, font_bytes: bytes, text: str, 
                     bbox_x: int, bbox_y: int, bbox_width: int, bbox_height: int,
                     text_color: str, initial_font_size: int = 120, format: str = "PNG") -> bytes:
    """
    Generates a single certificate in memory and returns its bytes.
    Useful for live /preview endpoint.
    """
    img = Image.open(io.BytesIO(template_bytes)).convert("RGB")
    draw = ImageDraw.Draw(img)
    
    font = get_font(font_bytes, text, bbox_width, bbox_height, initial_font_size)
    
    bbox = font.getbbox(text)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    center_x = bbox_x + (bbox_width / 2)
    center_y = bbox_y + (bbox_height / 2)
    
    adjusted_x = center_x - (text_width / 2)
    adjusted_y = center_y - (text_height / 2)
    
    # Text color should be parsed correctly, assuming hex string like "#000000" or simple name
    draw.text((adjusted_x, adjusted_y), text, fill=text_color, font=font)
    
    output_stream = io.BytesIO()
    img.save(output_stream, format=format)
    return output_stream.getvalue()
