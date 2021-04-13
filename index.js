const { Client } = require('pg')

const client = new Client({
    user: "postgres",
    password: "root",
    host: "localhost",
    port: 8080,
    database: "fabric"
})


async function execute() {
    try {
      await client.connect();
      console.log("Connected succesfully");

      const results = await client.query("select * from funcionario")
      console.table(results.rows)
    } 
    
    catch (e) {
      console.log('Something went wrong');
    } 
    
    finally {
      await client.end();
      console.log("Client disconnected successfully");
    }
  }
  
  execute();