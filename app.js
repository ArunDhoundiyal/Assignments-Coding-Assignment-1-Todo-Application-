const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const server_instance = express();
const format = require("date-fns/format");
const date_fns = require("date-fns");
const isMatch = require("date-fns/isMatch");
const isValid = require("date-fns/isValid");
const database_Path = path.join(__dirname, "todoApplication.db");
server_instance.use(express.json());
let dataBasePath = null;

const databaseAndServerInitialize = async () => {
  try {
    dataBasePath = await open({
      filename: database_Path,
      driver: sqlite3.Database,
    });
    server_instance.listen(7000, () => {
      console.log("Server is running on 6000 port");
    });
  } catch (Error) {
    console.log(`Database & Server Error ${Error.message}`);
    process.exit(-1);
  }
};
databaseAndServerInitialize();

///////////////////////////////////////////////////////////

const getAllTodo_snake_case_to_camelCase = (todoArray) => {
  return {
    id: todoArray.id,
    todo: todoArray.todo,
    priority: todoArray.priority,
    status: todoArray.status,
    category: todoArray.category,
    dueDate: todoArray.due_date,
  };
};

const getTodoPriorityStatus = (request_query) => {
  return (
    request_query.priority !== undefined && request_query.status !== undefined
  );
};

const getTodoSearch_q = (request_query) => {
  return request_query.search_q !== undefined;
};

const getTodoCategoryAndStatus = (request_query) => {
  return (
    request_query.category !== undefined && request_query.status !== undefined
  );
};

const getTodoCategoryAndPriority = (request_query) => {
  return (
    request_query.category !== undefined && request_query.priority !== undefined
  );
};

// API 1 GET method
server_instance.get("/todos/", async (request, response) => {
  const request_query = request.query;
  const { status, priority, search_q, category } = request_query;

  let getTodo;
  let invalidError;

  const priorityArray = ["HIGH", "MEDIUM", "LOW"];
  const check_priorityArray = priorityArray.includes(priority);

  const statusArray = ["TO DO", "IN PROGRESS", "DONE"];
  const checkStatusArray = statusArray.includes(status);

  const categoryArray = ["WORK", "HOME", "LEARNING"];
  const check_categoryArray = categoryArray.includes(category);

  //  Scenario 1 Returns a list of all todos whose status is 'TO DO'
  if (checkStatusArray) {
    getTodo = `SELECT * FROM todo WHERE status = '${status}';`;
  }

  //  Scenario 2 Returns a list of all todos whose priority is 'HIGH'
  else if (check_priorityArray) {
    getTodo = `SELECT * FROM todo WHERE priority = '${priority}';`;
  }

  // Scenario 3 Returns a list of all todos whose priority is 'HIGH' and status is 'IN PROGRESS'
  else if (getTodoPriorityStatus(request_query)) {
    getTodo = `SELECT * FROM todo WHERE priority = '${priority}' AND status = '${status}';`;
  }

  // Scenario 4 Returns a list of all todos whose todo contains 'Buy' text
  else if (getTodoSearch_q(request_query)) {
    getTodo = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%';`;
  }

  // Scenario 5 Returns a list of all todos whose category is 'WORK' and status is 'DONE'
  else if (getTodoCategoryAndStatus(request_query)) {
    getTodo = `SELECT * FROM todo WHERE category = '${category}' AND status = '${status}';`;
  }

  // Scenario 6 Returns a list of all todos whose category is 'HOME'
  else if (check_categoryArray) {
    getTodo = `SELECT * FROM todo WHERE category = '${category}';`;
  }

  // Scenario 7 Returns a list of all todos whose category is 'LEARNING' and priority is 'HIGH'
  else if (getTodoCategoryAndPriority(request_query)) {
    getTodo = `SELECT * FROM todo WHERE category = '${category}' AND priority = '${priority}';`;
  }

  //
  else {
    if (checkStatusArray === false && status !== undefined) {
      invalidError = "Invalid Todo Status";
    } else if (check_priorityArray === false && priority !== undefined) {
      invalidError = "Invalid Todo Priority";
    } else if (check_categoryArray === false && category !== undefined) {
      invalidError = "Invalid Todo Category";
    }
  }
  try {
    const getAllTodo = await dataBasePath.all(getTodo);
    response.send(
      getAllTodo.map((todoArray) =>
        getAllTodo_snake_case_to_camelCase(todoArray)
      )
    );
  } catch (error) {
    console.error(`Error for handling the request from client '${error}'`);
    response.status(400).send(invalidError);
  }
});

// API 2 GET method (Path: /todos/:todoId/  Returns a specific todo based on the todo ID)
server_instance.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getSpecificTodoSQLQuery = `SELECT * FROM todo WHERE id = '${todoId}';`;
  const getSpecificTodo = await dataBasePath.get(getSpecificTodoSQLQuery);
  response.send(getAllTodo_snake_case_to_camelCase(getSpecificTodo));
});

// API 3 GET method (Path: /agenda/?date=2021-12-12 Returns a list of all todos with a specific due date in the query parameter /agenda/?date=2021-12-12)
server_instance.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  const { parse, format } = date_fns;
  try {
    const parsedDate = parse(date, "yyyy-MM-dd", new Date());
    const formattedDate = format(parsedDate, "yyyy-MM-dd");
    const getSpecificTodoDueDateQuery = `SELECT * FROM todo WHERE due_date ='${formattedDate}';`;

    const getDueDateTodo = await dataBasePath.all(getSpecificTodoDueDateQuery);
    if (getDueDateTodo.length === 0) {
      response.send("Data is not found in database");
    } else {
      response.send(
        getDueDateTodo.map((getArray) =>
          getAllTodo_snake_case_to_camelCase(getArray)
        )
      );
    }
  } catch (error) {
    console.error(`${error}`);
    response.status(400).send("Invalid Due Date");
  }
});

/////////////////////////////////////////////////////////////

server_instance.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const request_body = request.body;

  const previousTableData = `SELECT * FROM todo WHERE id = '${todoId}'; `;
  const previousTable_data = await dataBasePath.get(previousTableData);

  const {
    todo = previousTable_data.todo,
    priority = previousTable_data.priority,
    status = previousTable_data.status,
    category = previousTable_data.category,
    dueDate = previousTable_data.due_date,
  } = request.body;

  const status_array = ["TO DO", "IN PROGRESS", "DONE"];
  const check_status_array = status_array.includes(status);

  const priority_array = ["HIGH", "MEDIUM", "LOW"];
  const check_priority_array = priority_array.includes(priority);

  const category_array = ["WORK", "HOME", "LEARNING"];
  const check_category_array = category_array.includes(category);

  let updateTodoQuery;
  switch (true) {
    case request_body.status !== undefined:
      if (check_status_array) {
        updateTodoQuery = ` UPDATE todo SET 
          todo = '${todo}', priority = '${priority}', status = '${status}', category = '${category}', due_date = '${dueDate}'
          WHERE id = '${todoId}' ;`;
        await dataBasePath.run(updateTodoQuery);
        response.send("Status Updated");
      } else {
        response.status(400).send("Invalid Todo Status");
      }
      break;
    case request_body.priority !== undefined:
      if (check_priority_array) {
        updateTodoQuery = ` UPDATE todo SET 
          todo = '${todo}', priority = '${priority}', status = '${status}', category = '${category}', due_date = '${dueDate}'
          WHERE id = '${todoId}' ;`;
        await dataBasePath.run(updateTodoQuery);
        response.send("Priority Updated");
      } else {
        response.status(400).send("Invalid Todo Priority");
      }
      break;
    case request_body.category !== undefined:
      if (check_category_array) {
        updateTodoQuery = ` UPDATE todo SET todo = '${todo}', priority = '${priority}', status = '${status}', category = '${category}', due_date = '${dueDate}'
          WHERE id = '${todoId}' ;`;
        await dataBasePath.run(updateTodoQuery);
        response.send("Category Updated");
      } else {
        response.status(400).send("Invalid Todo Category");
      }
      break;
    case request_body.todo !== undefined:
      updateTodoQuery = ` UPDATE todo SET todo = '${todo}', priority = '${priority}', status = '${status}', category = '${category}', due_date = '${dueDate}'
          WHERE id = '${todoId}' ;`;
      await dataBasePath.run(updateTodoQuery);
      response.send("Todo Updated");
      break;
    case request_body.dueDate !== undefined:
      if (isMatch(dueDate, "yyyy-M-d")) {
        const parsedDate = new Date(dueDate);
        const format_date = format(parsedDate, "yyyy-MM-dd");
        updateTodoQuery = `UPDATE todo SET todo = '${todo}', priority = '${priority}', status = '${status}', category = '${category}', due_date = '${format_date}'
     WHERE id = '${todoId}' ;`;
        await dataBasePath.run(updateTodoQuery);
        response.send("Due Date Updated");
      } else {
        response.status(400).send("Invalid Due Date");
      }
      break;
  }
});

server_instance.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTableQuery = `DELETE FROM todo WHERE id = '${todoId}' ;`;
  await dataBasePath.run(deleteTableQuery);
  response.send("Todo Deleted");
});

server_instance.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const priorityArray = ["HIGH", "MEDIUM", "LOW"].includes(priority);
  const statusArray = ["TO DO", "IN PROGRESS", "DONE"].includes(status);
  const categoryArray = ["WORK", "HOME", "LEARNING"].includes(category);
  const isValidDate = isMatch(dueDate, "yyyy-M-d");

  switch (true) {
    case priorityArray === false:
      await response.status(400).send("Invalid Todo Priority");
      break;
    case statusArray === false:
      await response.status(400).send("Invalid Todo Status");
      break;
    case categoryArray === false:
      await response.status(400).send("Invalid Todo Category");
      break;
    case isValidDate === false:
      await response.status(400).send("Invalid Due Date");
      break;
    case id === undefined:
      await response.status(400).send("Id Undefined");
      break;
    case todo === undefined:
      await response.status(400).send("Todo Undefined");
      break;
    default:
      if (
        priorityArray &&
        statusArray &&
        categoryArray &&
        isValidDate &&
        id !== undefined &&
        todo !== undefined
      ) {
        const validDueDate = format(new Date(dueDate), "yyyy-MM-dd");
        const postUserDataQuery = ` INSERT INTO todo (id, todo, category, priority, status, due_date)
      VALUES ( '${id}', '${todo}', '${priority}', '${status}', '${category}', '${validDueDate}');`;
        await dataBasePath.run(postUserDataQuery);
        response.send("Todo Successfully Added");
      }
  }
});

module.exports = server_instance;
