import io
import qrcode
from PIL import Image, ImageDraw, ImageFont

def get_font(font_bytes: bytes, text: str, max_width: int, max_height: int, initial_size: int):
    """
    Dynamically scales down the font size so that the text fits within max_width and max_height.
    font_bytes is the raw TrueType font file content in memory. 
    If missing, falls back to Arial.
    """
    fontsize = initial_size
    
    def _load(sz):
        if font_bytes:
            try:
                return ImageFont.truetype(io.BytesIO(font_bytes), sz)
            except Exception:
                pass
        
        try:
            return ImageFont.truetype("arial.ttf", sz)
        except OSError:
            try:
                return ImageFont.truetype("DejaVuSans.ttf", sz)
            except OSError:
                return ImageFont.load_default()

    font = _load(fontsize)
    
    while True:
        # getbbox might not exist or might fail on bitmap fonts, use getlength/fallback
        try:
            bbox = font.getbbox(text)
            width = bbox[2] - bbox[0]
            height = bbox[3] - bbox[1]
        except AttributeError:
            width = font.getlength(text)
            height = fontsize # rough estimation
            
        if (width <= max_width and height <= max_height) or fontsize <= 10:
            break
        fontsize -= 2
        font = _load(fontsize)
        
    return font

def generate_preview(template_bytes: bytes, font_bytes: bytes, text: str, 
                     bbox_x: int, bbox_y: int, bbox_width: int, bbox_height: int,
                     text_color: str, initial_font_size: int = 120, format: str = "PNG",
                     is_qrcode: bool = False, qr_url: Optional[str] = None,
                     qr_bg: str = "transparent",
                     align: str = "center") -> bytes:
    """
    Generates a single certificate in memory and returns its bytes.
    Useful for live /preview endpoint. Handles dynamic fonts and QR Code matrices.
    """
    img = Image.open(io.BytesIO(template_bytes)).convert("RGB")
    
    if is_qrcode and qr_url:
        qr = qrcode.QRCode(version=1, box_size=10, border=1)
        qr.add_data(qr_url)
        qr.make(fit=True)
        # We must support alpha channel so we render onto the template cleanly
        qr_img = qr.make_image(fill_color=text_color, back_color=qr_bg).convert("RGBA")
        qr_img = qr_img.resize((bbox_width, bbox_height), Image.Resampling.LANCZOS)
        
        # QR Codes: bbox_x and bbox_y represent the CENTER of the bounding box.
        # PIL paste requires the top-left coordinate.
        top_left_x = int(bbox_x - (bbox_width / 2))
        top_left_y = int(bbox_y - (bbox_height / 2))
        
        # Paste the QR matrix onto the main certificate canvas using itself as a transparency mask
        img.paste(qr_img, (top_left_x, top_left_y), mask=qr_img)
    else:
        # Standard TrueType text rendering logic
        draw = ImageDraw.Draw(img)
        font = get_font(font_bytes, text, bbox_width, bbox_height, initial_font_size)
        bbox = font.getbbox(text)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Determine top-left coordinate based on frontend's center origin and alignment
        if align == "left":
            # bbox_x is the center of the total box, so we subtract half the box width to get start
            # then add/subtract as needed. Actually, bbox_x/y is the geometric center of the draggable field.
            # To align left, start at (center_x - box_width/2)
            adjusted_x = bbox_x - (bbox_width / 2)
        elif align == "right":
            # To align right, end at (center_x + box_width/2)
            adjusted_x = (bbox_x + (bbox_width / 2)) - text_width
        else: # center
            adjusted_x = bbox_x - (text_width / 2)

        # Standard vertical centering
        adjusted_y = bbox_y - (text_height / 2)
        
        draw.text((adjusted_x, adjusted_y), text, fill=text_color, font=font)
    
    output_stream = io.BytesIO()
    img.save(output_stream, format=format)
    return output_stream.getvalue()
