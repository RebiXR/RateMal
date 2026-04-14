import cv2
import numpy as np

def generate_pbn_classic(image_path, num_colors=15, min_area=100):
    # 1. LOAD & PRE-PROCESS (Bilateral Filter)
    # This smooths the skin/textures while keeping edges sharp
    img = cv2.imread(image_path)
    # d=9, sigmaColor=75, sigmaSpace=75 are standard "strong" smoothing values
    smoothed = cv2.bilateralFilter(img, 9, 75, 75)
    
    # 2. COLOR QUANTIZATION (K-Means in Lab Space)
    # Lab space is better for color distance than RGB
    img_lab = cv2.cvtColor(smoothed, cv2.COLOR_BGR2Lab)
    data = img_lab.reshape((-1, 3)).astype(np.float32)
    
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 0.1)
    _, labels, centers = cv2.kmeans(data, num_colors, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
    
    # Reconstruct the quantized image
    centers = np.uint8(centers)
    quantized_lab = centers[labels.flatten()].reshape(img_lab.shape)
    quantized_bgr = cv2.cvtColor(quantized_lab, cv2.COLOR_Lab2BGR)
    
    # 3. ISLAND DISCOVERY & FILTERING
    # We find "islands" of the same color and remove those that are too small
    h, w = quantized_lab.shape[:2]
    final_labeled_canvas = np.zeros((h, w), dtype=np.int32)
    island_count = 0
    
    # Process each color in the palette separately
    for color_idx in range(num_colors):
        # Create a mask for this specific color
        mask = np.all(quantized_lab == centers[color_idx], axis=-1).astype(np.uint8) * 255
        
        # Find connected components (Islands) for this color
        num_ids, ids = cv2.connectedComponents(mask)
        
        for i in range(1, num_ids): # Skip background (0)
            island_mask = (ids == i).astype(np.uint8)
            area = np.sum(island_mask)
            
            if area > min_area:
                island_count += 1
                final_labeled_canvas[island_mask == 1] = island_count
            else:
                # OPTIONAL: Here you could merge tiny islands with neighbors
                # For simplicity, we just leave them blank or fill with a default
                pass

    # 4. CONTOUR EXTRACTION (The Line Art)
    # We look for pixels where the neighbor has a different Island ID
    # A simple gradient on the ID map works best
    kernel = np.array([[-1,-1,-1], [-1,8,-1], [-1,-1,-1]])
    edges = cv2.filter2D(final_labeled_canvas.astype(np.float32), -1, kernel)
    line_art = np.where(edges != 0, 0, 255).astype(np.uint8) # Black lines on white
    
    # 5. LABELING (Centroids for Numbers)
    canvas_with_numbers = cv2.cvtColor(line_art, cv2.COLOR_GRAY2BGR)
    
    for i in range(1, island_count + 1):
        island_mask = (final_labeled_canvas == i).astype(np.uint8)
        
        # Get the color index from the original quantized image for this island
        # We just pick one pixel from the mask to see what color it was
        y_coords, x_coords = np.where(island_mask)
        first_y, first_x = y_coords[0], x_coords[0]
        
        # Find the color ID (1 to num_colors)
        # We find which center matches the pixel at (first_y, first_x)
        pixel_lab = quantized_lab[first_y, first_x]
        color_id = np.where(np.all(centers == pixel_lab, axis=1))[0][0] + 1
        
        # Find the best place for the number (Distance Transform)
        # This finds the point furthest from the edges of the island
        dist_transform = cv2.distanceTransform(island_mask, cv2.DIST_L2, 3)
        _, _, _, max_loc = cv2.minMaxLoc(dist_transform)
        
        # Draw the number
        cv2.putText(canvas_with_numbers, str(color_id), max_loc, 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.3, (150, 150, 150), 1)

    return quantized_bgr, canvas_with_numbers, centers



def main():
    # EXECUTION
    result_img, pbn_map, palette = generate_pbn_classic('gadse.jpg', num_colors=12, min_area=150)
    cv2.imwrite('pbn_preview.png', result_img)
    cv2.imwrite('pbn_map.png', pbn_map)
    

if __name__ == "__main__":
    main()