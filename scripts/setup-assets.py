from pathlib import Path
from shutil import copy2
import json
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root.parent / 'yellow-war-assets-original/yellow-war-character-assets-v1.1'
names = ['miner', 'swordsman', 'archer', 'spearman', 'mage', 'giant']
metadata = {}
for file, name in zip(sorted(source.glob('0*.png')), names):
    destination = root / 'public/assets/characters' / f'{name}.png'
    destination.parent.mkdir(parents=True, exist_ok=True)
    copy2(file, destination)
    with Image.open(file) as im:
        left, top, right, bottom = im.getchannel('A').getbbox()
        metadata[name] = {'x': left, 'y': top, 'width': right-left, 'height': bottom-top}
(root / 'src/config').mkdir(parents=True, exist_ok=True)
(root / 'src/config/characterFrames.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
(root / 'docs/reference').mkdir(parents=True, exist_ok=True)
copy2(source / 'source_lineup_reference.png', root / 'docs/reference/character-lineup-reference.png')
for folder in ['backgrounds', 'buildings', 'effects', 'ui', 'audio']:
    path = root / 'public/assets' / folder
    path.mkdir(parents=True, exist_ok=True)
    (path / '.gitkeep').touch()
for folder in ['systems', 'services']:
    path = root / 'src' / folder
    path.mkdir(parents=True, exist_ok=True)
    (path / '.gitkeep').touch()
print('Copied six original PNGs and reference. Generated alpha-bound frame metadata.')
