import re
import sys

def check_tags(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove comments
    content = re.sub(r'{\/\*.*?\*\/}', '', content, flags=re.DOTALL)
    content = re.sub(r'\/\*.*?\*\/', '', content, flags=re.DOTALL)
    
    # Track divs, cards, etc. (just a simple check)
    opens = content.count('<div')
    closes = content.count('</div')
    print(f"Divs: Opens={opens}, Closes={closes}")

    opens_p = content.count('(')
    closes_p = content.count(')')
    print(f"Parentheses: Opens={opens_p}, Closes={closes_p}")

    opens_b = content.count('{')
    closes_b = content.count('}')
    print(f"Braces: Opens={opens_b}, Closes={closes_b}")

if __name__ == "__main__":
    check_tags(sys.argv[1])
