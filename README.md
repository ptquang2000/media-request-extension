### Media Request Extension

- Work on firefox.
- Inspect media requests.
- Export a list of URIs for aria2c input-file options.
- The export is saved as `aria2-input.txt` in your browser's download folder; run `aria2c -i aria2-input.txt` from there so media files are saved to the same folder.
- On Windows, exported `out=` names are capped so that both the media file and aria2c's progress/control file (`<out>.aria2`) stay within MAX_PATH (260), assuming a download folder of at most 30 characters. If aria2c reports `Failed to write into the segment file`, run it from a shorter folder (e.g. `C:\Temp`) or clear read-only/hidden attributes on the `.aria2` file.
