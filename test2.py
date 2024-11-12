from PIL import Image, ImageDraw, ImageFont
import numpy as np

# Example JSON data (replace with actual data)
data = [
    {"input": [[0, 1, 0], [0, 1, 0], [1, 3, 1]], "output": [[1, 0, 1], [1, 0, 1], [1, 0, 1]]},
    {"input": [[0, 1, 0, 1], [0, 2, 0, 2], [1, 0, 1, 4]], "output": [[1, 0, 1], [1, 0, 1], [1, 0, 1]]},
    {"input": [[0, 1, 0], [0, 1, 0], [1, 0, 1]], "output": [[1, 0, 1], [1, 0, 1], [1, 0, 1]]},
    {"input": [[0, 1, 0], [0, 1, 0], [1, 0, 1]]}
]

# Function to generate a grid image from 2D array
def create_grid_image(grid, cell_size=50, has_question_mark=False):
    rows, cols = len(grid), len(grid[0])
    img = Image.new('RGB', (cols * cell_size, rows * cell_size), color='white')
    draw = ImageDraw.Draw(img)

    # Font for the "?" symbol
    try:
        font = ImageFont.truetype("arial.ttf", size=cell_size - 10)
    except:
        font = ImageFont.load_default()

    for i in range(rows):
        for j in range(cols):
            color = (0, 0, 0) if grid[i][j] == 0 else (255, 0, 0) if grid[i][j] == 1 else (0, 255, 0) if grid[i][j] == 2 else (0, 0, 255)
            draw.rectangle([j * cell_size, i * cell_size, (j + 1) * cell_size, (i + 1) * cell_size], fill=color)

    # Add the "?" in the bottom-right corner if needed
    if has_question_mark:
        draw.text(((cols - 1) * cell_size + cell_size // 3, (rows - 1) * cell_size + cell_size // 5), "?", fill="red", font=font)

    return img

# Function to visualize inputs and outputs in a single combined image
def generate_combined_image(data, cell_size=50):
    images = []
    
    for entry in data:
        input_grid = np.array(entry["input"])
        output_grid = np.array(entry.get("output", []))

        # If output is missing or shorter than input, pad with zeros and add "?"
        has_question_mark = False
        if output_grid.size == 0 or input_grid.shape != output_grid.shape:
            output_grid = np.zeros_like(input_grid)
            has_question_mark = True

        # Generate input and output images
        input_image = create_grid_image(input_grid, cell_size)
        output_image = create_grid_image(output_grid, cell_size, has_question_mark)

        # Combine both images horizontally
        combined_image = Image.new('RGB', (input_image.width + output_image.width, input_image.height))
        combined_image.paste(input_image, (0, 0))
        combined_image.paste(output_image, (input_image.width, 0))

        images.append(combined_image)
    
    # Combine all images vertically
    total_width = images[0].width
    total_height = sum(img.height for img in images)
    final_image = Image.new('RGB', (total_width, total_height))
    
    y_offset = 0
    for img in images:
        final_image.paste(img, (0, y_offset))
        y_offset += img.height
    
    return final_image

# Generate the combined image and save it
combined_image = generate_combined_image(data)
combined_image.show()  # To preview the image
combined_image.save('combined_grid_image.png')  # Save as a single PNG file
