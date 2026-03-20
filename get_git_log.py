import subprocess
result = subprocess.run(['git', 'log', '-n', '15', '--pretty=format:%h - %s (%cr)'], cwd=r'd:\RMS_Siprahub', capture_output=True, text=True)
print(result.stdout)
