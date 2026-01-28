import { extract } from "./extract";
import { clean } from "./clean";
import { status } from "./status";

const command = process.argv[2];

switch (command) {
  case "extract":
  case undefined:
    await extract();
    break;

  case "clean":
    await clean();
    break;

  case "status":
    await status();
    break;

  default:
    console.log(`
Usage: bun i18n [command]

Commands:
  extract   Extract translations (AST based)
  clean     Remove unused keys
  status    Show progress
`);
}
