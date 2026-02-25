import cv2
import config

if __name__ == "__main__":
    print(f"Loading image from {config.TEMPLATE_IMAGE}")
    img = cv2.imread(config.TEMPLATE_IMAGE)
    if img is None:
        print(f"Error: Could not load {config.TEMPLATE_IMAGE}. Please make sure the file exists.")
        exit(1)
        
    print("Drag a rectangle on the image to select the region where the name should be.")
    print("Press SPACE or ENTER when done selecting.")
    print("Press 'c' to cancel the selection.")

    # cv2.selectROI allows the user to drag a rectangle (Region of Interest)
    roi_name = 'Select Text Region (Press SPACE when done)'
    roi = cv2.selectROI(roi_name, img, showCrosshair=True, fromCenter=False)
    cv2.destroyAllWindows()
    
    # roi returns a tuple: (x, y, width, height)
    x, y, w, h = roi
    if w > 0 and h > 0:
        print("\n--- Region Selected ---")
        print(f"Please update your config.py with these values:")
        print(f"BBOX_X = {x}")
        print(f"BBOX_Y = {y}")
        print(f"BBOX_WIDTH = {w}")
        print(f"BBOX_HEIGHT = {h}")
    else:
        print("\nSelection cancelled or empty region selected.")
