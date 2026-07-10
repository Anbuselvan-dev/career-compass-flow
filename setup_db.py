import os
import getpass

def run():
    print("=========================================================")
    print("          SUPABASE DATABASE SETUP UTILITY")
    print("=========================================================")

    # Install pg8000 pure-python driver if not present
    try:
        import pg8000
    except ImportError:
        print("Installing pure-python database driver (pg8000)...")
        import subprocess
        import sys
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pg8000"])
        import pg8000

    # Read SQL file
    try:
        with open("setup.sql", "r") as f:
            sql_content = f.read()
    except Exception as e:
        print(f"[-] Error reading setup.sql: {e}")
        return

    # Prompt user for database password
    print("\nNote: You can find your DB password in your Supabase project dashboard.")
    password = getpass.getpass("Enter your Supabase Database Password: ").strip()
    if not password:
        print("[-] Password cannot be empty.")
        return

    host = "db.jafyyarqdgyqykztocir.supabase.co"
    print(f"\n[+] Connecting to {host}...")

    try:
        conn = pg8000.connect(
            host=host,
            database="postgres",
            user="postgres",
            port=5432,
            password=password
        )
        cursor = conn.cursor()
        
        # Split sql statements by semicolon, avoiding issues with multiline comments
        # Standard PostgreSQL command execution
        print("[+] Executing SQL schema statements...")
        
        # Remove comments to avoid split issues
        clean_sql = ""
        for line in sql_content.splitlines():
            if not line.strip().startswith("--"):
                clean_sql += line + "\n"
                
        statements = [s.strip() for s in clean_sql.split(";") if s.strip()]
        for stmt in statements:
            cursor.execute(stmt)
            
        conn.commit()
        cursor.close()
        conn.close()
        print("\n[+] Success! Your users and resumes tables, indexes, and RLS policies are set up successfully.")
    except Exception as e:
        print(f"\n[-] Database connection failed: {e}")

if __name__ == "__main__":
    run()
