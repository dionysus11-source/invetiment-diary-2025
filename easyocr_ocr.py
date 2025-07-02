import sys
import easyocr
import json

def main():
    image_path = sys.argv[1]
    reader = easyocr.Reader(['ko', 'en'])
    result = reader.readtext(image_path, detail=0)
    text = '\n'.join(result)
    print(json.dumps({'text': text}, ensure_ascii=False))

if __name__ == '__main__':
    main()