import base64
import binascii
from io import BytesIO

from PIL import Image, UnidentifiedImageError


def validate_image(value):
    if value is None:
        return value
    header, separator, encoded = value.partition(",")
    formats = {"data:image/png;base64": "PNG", "data:image/jpeg;base64": "JPEG",
               "data:image/webp;base64": "WEBP"}
    if not separator or header not in formats:
        raise ValueError("Use a JPEG, PNG or WebP image data URL")
    try:
        content = base64.b64decode(encoded, validate=True)
        with Image.open(BytesIO(content), formats=list(formats.values())) as image:
            if image.format != formats[header] or not (0 < image.width <= 1600 and 0 < image.height <= 1600):
                raise ValueError("Image format or dimensions are invalid")
            image.verify()
        with Image.open(BytesIO(content)) as image:
            image.load()
    except (binascii.Error, OSError, UnidentifiedImageError, Image.DecompressionBombError) as error:
        raise ValueError("Invalid image data") from error
    return value
