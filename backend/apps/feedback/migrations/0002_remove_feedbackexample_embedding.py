# Remove embedding field from FeedbackExample model
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('feedback', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='feedbackexample',
            name='embedding',
        ),
    ]
