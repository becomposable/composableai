import { copyText } from "@becomposable/memory-commands"

/*
This is a test for the GenerateHaiku interaction.
Use the following mappings to test:
1. the default one (no explicit mapping). The following mapping will be used: {".": "."}
Run Generatehaiku like this:
composable run GenerateHaiku -d 'memory:path/to/memory.tar'
2. the mapping {".": ".", "topic": "content:topic.txt"}
Run Generatehaiku like this:
composable run GenerateHaiku -d 'memory:path/to/memory.tar' --mmap '{"." : ".", "topic": "content:topic.txt"}'
*/

copyText("space", "topic.txt")

export default {
    topic: "life",
    mood: "happy",
    language: "french",
}
