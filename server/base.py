from flask import Flask, request
from flask_cors import CORS


api = Flask(__name__)
CORS(api)

@api.route('/sscript', methods=['POST'])
def get_code():
    parsedCode = request.get_json()

    if parsedCode['kind'] != 'ok':
        return parsedCode['message']
    
    return str(parsedCode['value'])


if __name__ == "__main__":
    api.run(debug=True)