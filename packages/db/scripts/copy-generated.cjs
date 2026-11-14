const fs = require('fs')
const path = require('path')

const src = path.join(__dirname, '..', 'src', 'generated')
const dest = path.join(__dirname, '..', 'dist', 'src', 'generated')

if (fs.existsSync(src)) {
  fs.cpSync(src, dest, { recursive: true, force: true })
}
