# Third-party notices

`cpd-diff` invokes independently distributed upstream executables. The GitHub Action may download and cache these exact releases.

## jscpd 5.0.12

- Project: https://github.com/kucherenko/jscpd
- License: MIT
- Copyright: 2013-2024 Andrey Kucherenko

The MIT license permits use, copying, modification, distribution, sublicensing, and sale provided its copyright and permission notice are included. The upstream license file is authoritative and is included in jscpd's release materials.

## PMD 7.26.0

- Project: https://github.com/pmd/pmd
- License: BSD-style PMD license
- Copyright: 2003-2009 InfoEther, LLC

PMD permits source and binary redistribution with or without modification when its copyright notice, conditions, disclaimer, and required acknowledgments are retained. PMD distributions also contain dependency-specific notices under their own `LICENSE` files. The unmodified upstream archive downloaded by `cpd-diff` retains those files.

The PMD license requires end-user documentation, if included, to acknowledge: "This product includes software developed in part by support from the Defense Advanced Research Project Agency (DARPA)". It also prohibits using InfoEther's or contributors' names for endorsement without permission. See the complete authoritative terms in the PMD distribution and at https://github.com/pmd/pmd/blob/pmd_releases/7.26.0/LICENSE.

## No combined work

Neither engine is linked into this repository's source. Engine output is exchanged through subprocess files and standard streams. Keep this notice and the license files shipped in upstream archives when redistributing those archives.
