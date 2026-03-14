# QR Code Pack

[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM Version](https://img.shields.io/npm/v/qrcode-pack)](https://www.npmjs.com/package/qrcode-pack)
[![Release Version](https://img.shields.io/github/release/sarahcssiqueira/qrcode-pack.svg?color)](https://github.com/sarahcssiqueira/qrcode-pack/releases/latest)
[![Support Level](https://img.shields.io/badge/support-may_take_time-yellow.svg)](#support-level)


## Installation

To install run:

`npm i qrcode-pack` or 

`yarn add qrcode-pack`


## Usage

````
import QRCodeGenerator from 'qrcode-pack';

const qr = new QRCodeGenerator('Hello World');
qr.buildMatrix();
qr.renderToCanvas('canvasID');

````
## Props

| Prop / Method           | Type                        | Default | Description |
|-------------------------|----------------------------|---------|-------------|
| `text`                  | `string`                   | `""`    | The content to encode in the QR Code. |
| `ecLevel`               | `"L" | "M" | "Q" | "H"`   | `"H"`   | Error correction level of the QR Code. `"L"` = low, `"H"` = high. |
| `version`               | `number`                   | `null`  | QR Code version (1–40). Higher versions store more data. If `null`, the version is calculated automatically. |
| `modules`               | `array`                    | `null`  | Internal matrix representing the QR Code modules (pixels). Populated after calling `buildMatrix()`. |
| `reserved`              | `array`                    | `null`  | Reserved areas in the matrix, such as alignment patterns and format markers. |
| `buildMatrix()`         | `function`                 | —       | Generates the internal QR Code matrix based on `text` and `ecLevel`. |
| `renderToCanvas(canvasId, size)` | `function`         | —       | Renders the QR Code to an HTML `<canvas>`. `canvasId` = ID of the canvas, `size` = width/height in pixels. |

## Contributing

Contributions are welcome.

- Fork the repository
- Create your feature branch (`git checkout -b feature/my-feature`)
- Commit your changes (`git commit -m 'commit message'`)
- Push to the branch (`git push origin feature/my-featuree`)
- Create a new Pull Request


## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE.md) file for details.


## Contact

Issues, suggestions, or feedback, create an [issue](https://github.com/sarahcssiqueira/qrcode-pack/issues).
