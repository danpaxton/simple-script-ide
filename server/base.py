from flask import Flask, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS


api = Flask(__name__)
api.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://newuser:G=scB(5,(-4g"9A<@localhost/sscript_db'
db = SQLAlchemy(api)
CORS(api)


class File(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.VARCHAR(27), nullable=False)
    source_code = db.Column(db.TEXT, nullable=False)

    def __repr__(self):
        return f"{self.title}: {self.source_code}"

    def __init__(self, title, source_code):
        self.title = title
        self.source_code = source_code


def format_file(file):
    return {
        "id": file.id,
        "title": file.title,
        "source_code": file.source_code,
    }

# Save file
@api.route('/sscript/new-file', methods=['POST'])
def save_file():
    data = request.get_json()
    file = File(data['title'], data['source_code'])
    db.session.add(file); db.session.commit()
    return format_file(file)


@api.route('/sscript/fetch-files', methods=['GET'])
def fetch_files():
    files = File.query.all()
    return { 'files': [format_file(file) for file in files] } 


# Get or Delete file
@api.route('/sscript/fetch-file/<id>', methods=['GET', 'DElETE'])
def fetch_file(id):
    file = File.query.filter_by(id=id).one()
    if request.method == 'GET':
        return format_file(file)
    else:
        db.session.delete(file); db.session.commit()
        return "File deleted."

# Update file
@api.route('/sscript/update-file/<id>', methods=['PUT'])
def update_file(id):
    file = File.query.filter_by(id=id)
    file.update(dict(source_code=request.json['source_code']))
    db.session.commit()
    return format_file(file.one())


# Interp parsed code
@api.route('/sscript/interp', methods=['POST'])
def interp_code():
    parsedCode = request.get_json()

    if parsedCode['kind'] != 'ok':
        return parsedCode['message']
    
    return "In development."


if __name__ == "__main__":
    api.run(debug=True, port=5000)