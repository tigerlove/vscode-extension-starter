export const elixirRules = [
  {
    tags: ["Elixir", "Phoenix"],
    title: "Elixir Phoenix Cursor Rules",
    libs: ["phoenix", "elixir", "ecto", "live_view", "tailwind", "postgresql"],
    slug: "elixir-phoenix-cursor-rules",
    content: `
  You are an expert in Elixir, Phoenix, PostgreSQL, LiveView, and Tailwind CSS.
  
  Code Style and Structure
  - Write concise, idiomatic Elixir code with accurate examples.
  - Follow Phoenix conventions and best practices.
  - Use functional programming patterns and leverage immutability.
  - Prefer higher-order functions and recursion over imperative loops.
  - Use descriptive variable and function names (e.g., user_signed_in?, calculate_total).
  - Structure files according to Phoenix conventions (controllers, contexts, views, etc.).
  
  Naming Conventions
  - Use snake_case for file names, function names, and variables.
  - Use PascalCase for module names.
  - Follow Phoenix naming conventions for contexts, schemas, and controllers.
  
  Elixir and Phoenix Usage
  - Use Elixir's pattern matching and guards effectively.
  - Leverage Phoenix's built-in functions and macros.
  - Use Ecto effectively for database operations.
  
  Syntax and Formatting
  - Follow the Elixir Style Guide (https://github.com/christopheradams/elixir_style_guide)
  - Use Elixir's pipe operator |> for function chaining.
  - Prefer single quotes for charlists and double quotes for strings.
  
  Error Handling and Validation
  - Use Elixir's "let it crash" philosophy and supervisor trees.
  - Implement proper error logging and user-friendly messages.
  - Use Ecto changesets for data validation.
  - Handle errors gracefully in controllers and display appropriate flash messages.
  
  UI and Styling
  - Use Phoenix LiveView for dynamic, real-time interactions.
  - Implement responsive design with Tailwind CSS.
  - Use Phoenix view helpers and templates to keep views DRY.
  
  Performance Optimization
  - Use database indexing effectively.
  - Implement caching strategies (ETS, Redis).
  - Use Ecto's preload to avoid N+1 queries.
  - Optimize database queries using preload, joins, or select.
  
  Key Conventions
  - Follow RESTful routing conventions.
  - Use contexts for organizing related functionality.
  - Implement GenServers for stateful processes and background jobs.
  - Use Tasks for concurrent, isolated jobs.
  
  Testing
  - Write comprehensive tests using ExUnit.
  - Follow TDD practices.
  - Use ExMachina for test data generation.
  
  Security
  - Implement proper authentication and authorization (e.g., Guardian, Pow).
  - Use strong parameters in controllers (params validation).
  - Protect against common web vulnerabilities (XSS, CSRF, SQL injection).
  
  Follow the official Phoenix guides for best practices in routing, controllers, contexts, views, and other Phoenix components.
  `,
    author: {
      name: "Ilyich Vismara",
      url: "https://x.com/ilyichv_",
      avatar:
        "https://pbs.twimg.com/profile_images/1678750477750620160/Ssn1jz6h_400x400.jpg",
    },
  },
];
