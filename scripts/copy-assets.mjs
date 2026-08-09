// tsup can't compile .vue SFCs (no @vitejs/plugin-vue in the pipeline) and doesn't touch
// standalone ambient .d.ts files that aren't a build entry — both just need copying into
// dist as-is so the package.json `exports` paths resolve after `npm run build`.
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const copies = [
  ['src/vue/UpdatePrompt.vue', 'dist/vue/UpdatePrompt.vue'],
  ['src/client.d.ts', 'dist/client.d.ts'],
]

for (const [from, to] of copies) {
  mkdirSync(dirname(to), { recursive: true })
  copyFileSync(from, to)
}

console.log('copied:', copies.map(c => c[1]).join(', '))
