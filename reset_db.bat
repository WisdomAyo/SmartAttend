@echo off
echo ===========================
echo 🔄 Resetting Django + PostgreSQL Database
echo ===========================

REM Step 1: Delete migration files
for /d %%d in (backend\*) do (
    if exist %%d\migrations (
        del /Q %%d\migrations\0*.py
        echo Deleted migrations in %%d\migrations
    )
)

REM Step 2: Drop and recreate PostgreSQL database
echo.
echo Dropping and recreating FaceRec database...
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "DROP DATABASE IF EXISTS \"FaceRec\";"
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE \"FaceRec\" OWNER postgres;"

REM Step 3: Run Django migrations
echo.
echo Running makemigrations...
call venv\Scripts\activate
python manage.py makemigrations

echo.
echo Running migrate...
python manage.py migrate

echo.
echo ✅ Done! Database reset complete.
pause
