# Simple Script IDE
App url: https://simple-script-ide.herokuapp.com
## Running client locally.

Clone repository.
```console
$ git clone https://github.com/danpaxton/simple-script-ide.git
$ cd simple-script-ide
```

Install client dependencies and run.
```console
$ cd client
$ npm install
$ npm run start
```
The IDE should now be running on localhost port 3000.

## Usage
### Anonymous mode.
If the user is not logged in, the application will work for running an untitled program and downloading it to the user's local machine. These programs cannot be saved on the cloud.

### User mode.
The user can either create a new login or login with existing credentials. After a succesful login the new-file button should illuminate, once clicked the user is prompted with a textfield where they can entire a file name followed by '.ss'. After a file is loaded the save button should now be illuminated allowing the user to save their code directly on the cloud. The user can delete a file by clicking the delete button and then selecting the corresponding delete icon next to the file. Once the user logs out the app will return to anonymous mode.

### Output.
User can toggle the output/parse button to see the output of the code or the parse result represented in JSON.

## Frontend
Front end was built using React.js and makes requests to the backend api using axios. The app is styled using a grid layout, Material UI, and Google Icons and Fonts. After login, the user's name and access token are stored in local storage to prevent logout on refresh. If an access token is close to expiration upon request the access token will be refreshed after api response.  Using the Codemirror React component the app retrieves user input (code) as raw text. The parser is installed in the front end and is responsible for parsing the text into an abstract syntax tree before it is sent to the backend to be interpreted into a result.

Simple-Script-Parser: https://www.npmjs.com/package/sscript_parser

## Backend
Backend was built using a flask rest api and connects to a postgres database on the cloud using the heroku postgres addon. User authentication was implemented using flask-jwt and automatically refreshes tokens close to expiration by checking time stamps after each request and appending the new token to the request response if the token needs to be refreshed. The interpreter is installed in the backend and is responsible for interpreting an abstract syntax tree into a result before returning the response to the front end.

Simple-Script-Interpreter: https://github.com/danpaxton/simple-script-interpreter