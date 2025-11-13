<p align="center">
  <a href="https://www.newagesmb.com/" target="_blank"><img src="https://raw.githubusercontent.com/NewAgeSMBDevelopers/smb-logo/main/smb-logo.png" width="320" alt="Newage Logo" /></a>
</p>

<p align="center">A progressive <a href="http://nestjs.com/" target="_blank">NestJs</a> framework for building efficient and scalable server-side applications.</p>

# MongoDB

[Back to docs](./index.md)


## Config

- Set mongo db config as env variables. *Eg: add below env variables to .env file (Not recommended in production)*
  - ``` MONGO_URI=mongodb://localhost/db_name ```
  - Enable query logging ``` MONGO_LOGGING=Y ``` 
- Additional config can be done in ``` libs\mongo\src\mongo.config.ts ```


## References
- <a target="_blank" href="https://mongoosejs.com/">Mongoose (MongoDB)</a>
- <a target="_blank" href="https://docs.nestjs.com/techniques/mongodb">Mongoose Nest JS</a>