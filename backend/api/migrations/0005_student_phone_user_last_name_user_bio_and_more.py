# Generated by Django 5.2.3 on 2025-06-29 00:56

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0004_student_department"),
    ]

    operations = [
        migrations.AddField(
            model_name="student",
            name="phone",
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="Last_name",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="bio",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="department",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="faculty",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="phone",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="user",
            name="first_name",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="user",
            name="username",
            field=models.TextField(unique=True),
        ),
    ]
