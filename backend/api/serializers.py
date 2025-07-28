# api/serializers.py
from rest_framework import serializers
from .models import User, Course, Student, AttendanceRecord
from django.conf import settings
from django.contrib.auth import get_user_model
import uuid



User = get_user_model()
from djoser.serializers import UserCreateSerializer as DjoserBaseUserCreateSerializer

class UserSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    faculty = serializers.CharField(required=False, allow_blank=True)
    department = serializers.CharField(required=False, allow_blank=True)

    class Meta:
         model = User # Or settings.AUTH_USER_MODEL
         fields = (
             'id',
             'email',
             'first_name',
             'last_name',
             'bio',
             'phone',
             'faculty',
             'department',
             'profile_picture', 
             'last_login'
         )
         read_only_fields = ("email", "last_login") # Make email read-only if Djoser handles its changes
         
def update(self, instance, validated_data):
        # Assign each field manually
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.bio = validated_data.get('bio', instance.bio)
        instance.phone = validated_data.get('phone', instance.phone)
        instance.faculty = validated_data.get('faculty', instance.faculty)
        instance.department = validated_data.get('department', instance.department)

        instance.save()
        return instance         
         
def get_user_full_name(obj):
    return f"{obj.first_name or ''} {obj.last_name or ''}".strip() or obj.email

def get_student_full_name(obj):
    return f"{obj.first_name or ''} {obj.last_name or ''}".strip() or obj.student_id



class UserCreateSerializer(DjoserBaseUserCreateSerializer):
    # If you want first_name/last_name to be required during registration, add them here
    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=True, max_length=150)
    faculty = serializers.CharField(required=False, allow_blank=True, max_length=100) # Make optional
    department = serializers.CharField(required=False, allow_blank=True, max_length=100)

    class Meta(DjoserBaseUserCreateSerializer.Meta):
        model = User # Use your custom user model
        # Include the fields you want the serializer to handle from the request
        fields = DjoserBaseUserCreateSerializer.Meta.fields + ('email','password','re_password','first_name', 'last_name', 'faculty', 'department') # Include first_name, last_name, and username

    # *** Override the create method to handle username ***
    def create(self, validated_data):
        # Auto-generate a unique username from email part + UUID
        # This ensures 'username' is always populated and unique if required by the model
        email_part = validated_data['email'].split('@')[0]
        # Generate a unique suffix
        unique_suffix = uuid.uuid4().hex[:6]
        username_value = f"{email_part}_{unique_suffix}"

        # Ensure uniqueness (optional but safer if email part is very common)
        # In practice, the UUID suffix makes collisions incredibly unlikely for typical use.
        # while User.objects.filter(username=username_value).exists():
        #     unique_suffix = uuid.uuid4().hex[:6]
        #     username_value = f"{email_part}_{unique_suffix}"


        # *** Add the auto-generated 'username' to validated_data ***
        # This makes it available as a keyword argument when super().create calls User.objects.create_user
        validated_data['username'] = username_value

        # Now, call the parent's create method.
        # This method handles password hashing, re_password validation,
        # and calls User.objects.create_user(**validated_data).
        # With USERNAME_FIELD='email', the first positional arg to create_user is email,
        # and other fields (including the 'username' we added to validated_data) are passed as kwargs.
        try:
            user = super().create(validated_data) # Calls DjoserBaseUserCreateSerializer.create -> User.objects.create_user(...)

            # If you need to perform actions *after* the user is created (like sending signals, etc.),
            # you can do it here. The user object should now have all fields populated.

        except TypeError as e:
             # This catch helps debug if the TypeError persists even after adding username to validated_data
             print(f"DEBUG: Persistent TypeError during super().create: {e}")
             print(f"DEBUG: Validated Data passed to super(): {validated_data}")
             raise serializers.ValidationError("Server error during user creation process.") from e # Re-raise as validation error

        except Exception as e:
            # Catch other potential errors during user creation
            print(f"DEBUG: Unexpected error during user creation: {e}")
            raise serializers.ValidationError(f"An unexpected error occurred during registration: {e}") from e


        return user
         
class NestedStudentSerializer(serializers.ModelSerializer):
     # Optional: Add a field to indicate if face is enrolled, using the has_face_enrolled method from the other serializer
     has_face_enrolled = serializers.SerializerMethodField()


     class Meta:
        model = Student
        fields = ['id', 'student_id', 'first_name', 'last_name', 'email', 'profile_photo', 'level', 'has_face_enrolled'] # Include key fields
        # Do NOT include 'courses' here to avoid infinite recursion when nesting in CourseSerializer

     def get_has_face_enrolled(self, obj):
        # The 'obj' is the Student instance.
        # We check if a related 'face_encoding' object exists for this student (if you keep the model)
        # OR simply check if profile_photo exists
        return bool(obj.profile_photo) # More accurate check if only profile_photo is used
         
         
class DashboardCourseSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ['id', 'name', 'course_code', 'student_count']
        read_only_fields = fields

    def get_student_count(self, obj):
        return obj.students.count()
      

class DashboardRecentAttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    timestamp = serializers.DateTimeField(format="%Y-%m-%d %H:%M")

    class Meta:
        model = AttendanceRecord
        fields = ['id', 'student_name', 'course_name', 'timestamp','is_present']
        read_only_fields =fields
        
        
        
class StudentSerializer(serializers.ModelSerializer):
    courses = serializers.PrimaryKeyRelatedField(many=True, read_only=True) # List of course IDs student is in
    has_face_enrolled = serializers.SerializerMethodField()

    class Meta:
        model = Student
        # Include all fields for the main student list/detail
        fields = ['id', 'student_id', 'first_name', 'last_name', 'email', 'phone', 'level', 'department', 'profile_photo', 'has_face_enrolled', 'courses']


    def get_has_face_enrolled(self, obj):
        # Check if profile_photo exists
        return bool(obj.profile_photo)

class CourseSerializer(serializers.ModelSerializer):
    # By default, __all__ includes the 'students' ManyToMany field as a list of PKs
    # If you explicitly list fields, make sure to include 'students' if you want PKs
    students = serializers.PrimaryKeyRelatedField(many=True, read_only=True) # This will list student IDs
    # Ensure User model has get_full_name or equivalent for source
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)


    class Meta:
        model = Course
        # Use a tuple for fields explicitly when mixing model fields and extra fields like teacher_name
        fields = ('id', 'name', 'course_code', 'description', 'schedule', 'department', 'semester', 'units', 'students', 'teacher', 'teacher_name')
        read_only_fields = ('teacher', 'students')
        
        
        # Course Detail Serializer (used for retrieve/detail view) - NESTS student data
class CourseDetailSerializer(serializers.ModelSerializer):
    # Override the 'students' field to use the NestedStudentSerializer
    # Explicitly define all the fields you want to include in the detail view
    # This avoids conflicts with the parent serializer's __all__
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField()
    course_code = serializers.CharField()
    description = serializers.CharField(allow_null=True, required=False)
    schedule = serializers.CharField(allow_null=True, required=False)
    department = serializers.CharField(allow_null=True, required=False)
    semester = serializers.CharField(allow_null=True, required=False)
    units = serializers.IntegerField(allow_null=True, required=False, read_only=True)
    level = serializers.CharField(allow_null=True, required=False)

    # *** Override the 'students' field to use the NestedStudentSerializer ***
    students = NestedStudentSerializer(many=True, read_only=True)

    # Include the teacher name field
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)

    # Include the teacher PK if needed
    teacher = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Course
        # *** CORRECTED: List all fields explicitly in the Meta class ***
        # This ensures only these fields are included, preventing the __all__ conflict
        fields = [
            'id',
            'name',
            'course_code',
            'description',
            'schedule',
            'department',
            'semester',
            'units',
            'level',
            'students',       # This is the overridden nested field
            'teacher',        # Teacher PK
            'teacher_name',   # Teacher name (extra field)
            # Add any other fields from the Course model you want in the detail view
        ]
        # Make sure read_only_fields are correctly applied for these fields
        read_only_fields = ('teacher',) # Teacher is read-only