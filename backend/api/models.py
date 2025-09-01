from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager, PermissionsMixin
from django.conf import settings # Needed for User foreign key if not using get_user_model
from django.utils import timezone
from django.utils.translation import gettext_lazy as _ # Good practice for field names
from .managers import CustomUserManager



class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_("The Email field must be set"))
        email = self.normalize_email(email)
        extra_fields.setdefault('is_active', True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)






class User(AbstractUser):
    email = models.EmailField(_("email address"), unique=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'department', 'faculty'] # Require names during creation
    
    username = None
    first_name = models.CharField(_("first name"), max_length=150, blank=False, null=False) # Assuming required
    last_name = models.CharField(_("last name"), max_length=150, blank=False, null=False) # Correct name

    profile_picture = models.ImageField(upload_to='teacher_profiles/', null=True, blank=True)
    bio = models.TextField(blank=True, null=True) # TextField is okay for bio
    department = models.CharField(_("department"), max_length=100, blank=True, null=True) # CharField
    faculty = models.CharField(_("faculty"), max_length=100, blank=True, null=True) # CharField
    phone = models.CharField(_("phone number"), max_length=20, blank=True, null=True) # CharField
    
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    data_joined=models.DateTimeField(default=timezone.now)
    
    objects = CustomUserManager()
    
    def __str__(self):
        return self.email

    # Optional: Add get_full_name if used in serializers
    def get_full_name(self):
         return f"{self.first_name or ''} {self.last_name or ''}".strip() or self.email # Use self.last_name

    def get_short_name(self):
         return self.first_name if self.first_name else self.email
    
    
class Course(models.Model):
    # The course model to store course details.
    name = models.CharField(max_length=200)
    course_code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True, null=True)
    schedule = models.CharField(max_length=100, blank=True, null=True)
    department = models.CharField(max_length=50, blank=True, null=True)
    semester = models.CharField(max_length=50, blank=True, null=True) # Consider choices if needed
    units = models.PositiveSmallIntegerField(blank=True, null=True) # Use PositiveSmallIntegerField
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='courses')

    def __str__(self):
        return f"{self.name} ({self.course_code})"

# SESSION: STUDENT AND ENROLLMENT
class Student(models.Model):
    # The student model.
    student_id = models.CharField(max_length=50, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True, null=True, blank=True)
    department = models.CharField(max_length=50, blank=True, null=True)
    # A profile photo for the student, which is optional.
    profile_photo = models.ImageField(upload_to='student_photos/', null=True, blank=True)
    # This links a student to the courses they are enrolled in. A student can be in many courses.
    courses = models.ManyToManyField(Course, related_name='students', blank=True)
    level = models.CharField(max_length=10, null=True, blank=True, help_text="e.g., 100L, 200L, 300L")
    phone = models.CharField(max_length=20, null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True,  related_name='created_students')
    

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.student_id})"

# SESSION: FACE RECOGNITION DATA
class FaceEncoding(models.Model):
    # This is the core of the face recognition system.
    # We store a mathematical representation (encoding) of a student's face.
    # Each student has a unique face encoding. OneToOneField ensures this.
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='face_encoding')
    # The encoding is a list of 128 numbers. We store it as a text field.
    encoding = models.TextField()
    # Timestamp for when the encoding was created or last updated.
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Encoding for {self.student.first_name} {self.student.last_name}"

# SESSION: ATTENDANCE RECORDS
class AttendanceRecord(models.Model):
    # This model stores each individual attendance event.
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    timestamp = models.DateTimeField()
    # We can use a status field if we want to mark students as absent later.
    # For now, a record's existence means the student was present.
    is_present = models.BooleanField(default=True)

    class Meta:
        # Ensures a student can only be marked once for a specific course on a specific day.
        unique_together = ('student', 'course', 'timestamp')

    def __str__(self):
        return f"{self.student} in {self.course} at {self.timestamp.strftime('%Y-%m-%d %H:%M')}"
    
    # --- Cache Invalidation Signals ---
# These functions are defined at the module level, NOT inside a class.

   