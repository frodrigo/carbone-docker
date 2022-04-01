# Carbone Docker

Embedded Carbone in a Docker image with simple REST API.

## How to consume exposed API ?

The simpliest way to use this image is to use `node` and install [`carbone-connect` package](https://npmjs.org/carbone-connect).

## Images

Images should be base64 encoded and send into the render request.
* `content`: base64 encoded image.
* `path`: path of the image to replace onto the zip archive.

In this way, image loop are not supported.

Render parameters example:
```json
{
    "data": {},
    "options": {},
    "images": [
        {
            "path": "Pictures/100000000000012C000000C8301A8B8F6814976E.png",
            "content": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAABA0lEQVR4AWMAAcNkBnnjNJYtRqnMH41SmD8YpzJvNk1kkAXJMerFMoixc3FcD/aI5FeQU2R+++0Zw6Grm/5//f+GgfE/QzsDUPXqxpURf6YdzfifulHqf8xKof81W9z+f/358X/gLJ4fjA51rN9F5Dk5QMpZORkY2P8KMvQFnmLYeWM2w5ydTT8ZfKZw/v0PBBP2J/0PmsP9/+LTff8vPd3/338q93+g6e+YPj37fXLK7pz/2XYzGKaGXmaQFdBi6NuVzPD+ye/fDP8ZdjCAHGmWzfquZ30W2KTypV7/rYtZfxklMb8xi2MQBnsT5CWjZOaNQPweiN8ZJzOv149jkAbJAQDOgW4m18mcLgAAAABJRU5ErkJggg=="
        }
    ]
}
```

## From carbone.io website

_Fast, Simple and Powerful report generator in any format PDF, DOCX, XLSX, ODT, PPTX, ODS [, ...]_

_... using your JSON data as input._

See [carbone.io website](https://carbone.io) for full **Carbone** documentation.

