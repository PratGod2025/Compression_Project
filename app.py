from flask import Flask, render_template, request, send_file
from PIL import Image
import io
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/compress', methods=['POST'])
def compress_image():
    if 'image' not in request.files:
        return "No image uploaded", 400
    
    file = request.files['image']
    if file.filename == '':
        return "No selected file", 400

    try:
        quality = int(request.form.get('quality', 50))
    except ValueError:
        quality = 50

    # Ensure quality is within 1-100
    quality = max(1, min(100, quality))

    try:
        img = Image.open(file.stream)
        
        # Convert to RGB if necessary (e.g. for PNGs with transparency if saving as JPEG)
        # However, we'll try to keep original format or default to JPEG for compression efficiency if user wants
        # For simplicity in this demo, let's enable converting to JPEG for better compression control
        # providing output_format as an option could be an enhancement
        
        output = io.BytesIO()
        
        # Determine format. Pillow 'quality' param works well for JPEG/WebP.
        # PNG is lossless so 'quality' param behaves differently or is ignored in some versions for compression level.
        # Let's default to saving as the original format unless it's not supported for writing, 
        # but force JPEG if the user wants strictly 'quality' based lossy compression often associated with this task.
        # For a premium feel, let's keep original format if possible but handle the quality.
        
        fmt = img.format if img.format else 'JPEG'
        
        if fmt.upper() in ['JPEG', 'JPG']:
             img.save(output, format='JPEG', quality=quality)
        elif fmt.upper() == 'PNG':
             # PNG uses 'compress_level' (0-9) not 1-100 quality. 
             # To serve the user's request of "choose the quality", converting to JPEG might be more intuitive 
             # OR we map 1-100 to 0-9 (inverse) but that's not exactly "quality".
             # Let's convert to optimized PNG if possible, or offer JPEG conversion.
             # PRO DECISION: For "compressing images", users usually accept JPEG conversion for high compression.
             # BUT preserving transparency is nice. 
             # Let's try to save as the original format. If PNG, we can't really apply strictly "quality=50%" in the JPEG sense easily without losing lossless.
             # However, we can use `optimize=True`.
             # FOR THIS TASK: Simplest robust path -> Convert to JPEG if user wants to aggressively compress, 
             # OR just use save() with quality param for supported formats.
             # Let's stick to the file's original format if it supports quality, else fallback or just optimize.
             
             # Actually, simpler approach for this specific request "compress images... choose quality":
             # We will save as JPEG if the user uploaded JPEG.
             # If PNG, we can preserve it but 'quality' param might not do much.
             # Let's fallback to JPEG if the user is okay with it? 
             # Let's stick to: Save as JPEG for maximum logic simplicity regarding "quality" slider, 
             # unless it has transparency, then stick to PNG but optimize.
             # Wait, `img.save(..., quality=...)` works for WebP and JPEG. 
             
            if img.mode in ('RGBA', 'LA'):
                # Has transparency, sticking to PNG or WebP is better. 
                # Converting to JPEG would replace transparent with black/white.
                # Let's output PNG but optimize.
                img.save(output, format=fmt, optimize=True)
            else:
                 img.save(output, format=fmt, quality=quality, optimize=True)
        else:
             # Fallback for others
             if img.mode == 'RGBA':
                 img = img.convert('RGB')
             img.save(output, format='JPEG', quality=quality)

        output.seek(0)
        
        return send_file(
            output, 
            mimetype=f'image/{fmt.lower() if fmt else "jpeg"}',
            as_attachment=True, 
            download_name=f"compressed_{file.filename}"
        )

    except Exception as e:
        return str(e), 500

if __name__ == '__main__':
    app.run(debug=True)
