# QR Code Pack

[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NPM Version](https://img.shields.io/npm/v/qrcode-pack)](https://www.npmjs.com/package/qrcode-pack)
[![Release Version](https://img.shields.io/github/release/sarahcssiqueira/qrcode-pack.svg?color)](https://github.com/sarahcssiqueira/qrcode-pack/releases/latest)


## Installation

To install run:

`npm i qrcode-pack` or 

`yarn add qrcode-pack`


## Usage

````
import QRCodeGenerator from 'qrcode-generator-js';

const qr = new QRCodeGenerator('Hello World');
qr.buildMatrix();
qr.renderToCanvas('myCanvas', 512);

````

## Props

TO DO

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
