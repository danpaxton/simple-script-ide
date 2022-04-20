from flask import Flask, request
from datetime import timedelta, timezone, datetime
from flask_jwt_extended import create_access_token, get_jwt, jwt_required, JWTManager, current_user
from werkzeug.security import check_password_hash, generate_password_hash
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from dotenv import load_dotenv
import json, os
load_dotenv()

api = Flask(__name__)
api.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DB_URI")
api.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
api.config['JWT_SECRET_KEY'] = os.getenv("SECRET_KEY")
api.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=3)
jwt = JWTManager(api)
db = SQLAlchemy(api)
migrate = Migrate(api, db)
CORS(api)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True, nullable=False)
    username = db.Column(db.VARCHAR(50), nullable=False)
    password = db.Column(db.Text, nullable=False)
    files = db.relationship('File', backref='user', order_by='File.id', lazy=True)

    def check_password(self, password):
        return check_password_hash(self.password, password)


class File(db.Model):
    id = db.Column(db.Integer, primary_key=True, nullable=False)
    title = db.Column(db.VARCHAR(43), nullable=False)
    source_code = db.Column(db.TEXT, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)


@jwt.user_identity_loader
def user_identity_lookup(user):
    return user.id


@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    identity = jwt_data["sub"]
    return User.query.filter_by(id=identity).one_or_none()


@api.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data['username']).one_or_none()
    if user and user.check_password(data['password']):
        return {
            'username': user.username,
            'access_token': create_access_token(identity=user)
        }

    return {'msg': 'Invalid login credentials'}, 401


@api.route('/create-user', methods=['POST'])
def create_user():
    data = request.get_json()
    username = data['username']
    user = User.query.filter_by(username=username.lower()).one_or_none()
    if not user:
        user = User(username=username, password=generate_password_hash(data['password']))
        db.session.add(user); db.session.commit()
        return { 'msg': 'user created successfully.'}
    
    return { 'msg':'user already exists.' }, 401



@api.after_request
def refresh_expiring_jwts(response):
    try:
        exp_timestamp = get_jwt()["exp"]
        now = datetime.now(timezone.utc)
        target_timestamp = datetime.timestamp(now + timedelta(minutes=30))
        if target_timestamp > exp_timestamp:
            access_token = create_access_token(identity=current_user)
            data = response.get_json()
            if type(data) is dict:
                data["access_token"] = access_token 
                response.data = json.dumps(data)
        return response
    except (RuntimeError, KeyError):
        return response


def format_file(file):
    return {
        'id': file.id,
        'title': file.title,
        'source_code': file.source_code,
    }


def binary_search(fileList, id):
    l, r = 0, len(fileList) - 1
    target = int(id)
    while (l <= r):
        m = l + (r - l) // 2
        if fileList[m].id < target:
            l = m + 1
        elif fileList[m].id > target:
            r = m - 1
        else:
            return (m, fileList[m])
    
    return None


# Save file
@api.route('/new-file', methods=['POST'])
@jwt_required()
def new_file():
    data = request.get_json()
    file = File(title=data['title'], source_code=data['source_code'], user=current_user)
    db.session.add(file); db.session.commit()
    return { 'file': format_file(file) }


@api.route('/fetch-files', methods=['GET'])
@jwt_required()
def fetch_files():
    return { 'files': [format_file(file) for file in current_user.files] } 


# Get or Delete file
@api.route('/fetch-file/<id>', methods=['GET', 'DELETE'])
@jwt_required()
def fetch_file(id):
    files = current_user.files
    pos, file = binary_search(files, id)
    if request.method == 'GET':
        return { 'file': format_file(file) }
    else:
        next_file = None
        if len(current_user.files) > 1:
            next_file = files[pos - 1 if pos else pos + 1].id

        db.session.delete(file); db.session.commit()
        return {'next_file': next_file}


# Update file
@api.route('/update-file/<id>', methods=['PUT'])
@jwt_required()
def update_file(id):
    pos, file = binary_search(current_user.files, id)
    file.source_code = request.json['source_code']
    db.session.commit()
    return { 'msg': 'file updated.' }


# Interp parsed code
@api.route('/interp', methods=['POST'])
def interp_code():
    parsedCode = request.get_json()

    if parsedCode['kind'] != 'ok':
        return { 'output': parsedCode['message'] }
    
    return { 'output': 'in development' }


if __name__ == '__main__':
    api.run()