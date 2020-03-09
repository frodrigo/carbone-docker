# Carbone Docker
Embedded Carbone in a Docker image with simple REST API.

## Authentication
Requests require HTTP Basic Authentication. Username and password must be passed to the node process via the USERNAME and PASSWORD environment variables, otherwise it will exit immedately with a non-zero exit code and, thus, stop the container.

## How to consume exposed API ?
The simpliest way to use this image is to use `node` and install [`carbone-connect` package](https://npmjs.org/carbone-connect).

## From carbone.io website
_Fast, Simple and Powerful report generator in any format PDF, DOCX, XLSX, ODT, PPTX, ODS [, ...]_

_... using your JSON data as input._

See [carbone.io website](https://carbone.io) for full **Carbone** documentation.

