# Sample Architecture

## User Registration Flow

```eventlanes
cmd:CreateUser -> evt:UserCreated
evt:UserCreated -> rm:Users List
```
<!-- eventlanes-diagram -->
![Event Lanes Diagram](https://scr.eventlanes.app/scr/MYWwJgXAwgTgpgQwC5wKoGc4wAQFoB82cAbkhBlrIimAFAlkUxXJxh6EwjmYzrYAZAJbokQA/ddbb498db75f0350c0216a51713d4f6cf857901097be89bb355a156d0e4cc2fd)
<!-- /eventlanes-diagram -->

## Payment Processing

```eventlanes
cmd:ProcessPayment -> evt:PaymentProcessed
evt:PaymentProcessed -> rm:Payment History
rm:Payment History -> aut:Receipt Sender
aut:Receipt Sender -> cmd:SendReceipt
```
<!-- eventlanes-diagram -->
![Event Lanes Diagram](https://scr.eventlanes.app/scr/MYWwJgXACgTg9sApgZ2VAhgTxIgdgFwAIBaAPkMQDd9oscDYEVlEwAoKmjbPfRpVKxLkYIWjwKEAEgEtk+ODExtR4+kVnzFmYYXQBXGgCVESGQAciAZTxhEMNgeOnEF67fu7QkG7jAmzSyA/06a2ca916c4289d41a122b70a84aac477ecac0cb66fb9c584d4fafe9389cd874)
<!-- /eventlanes-diagram -->

Some text between blocks.

## Already Processed Block

```eventlanes
cmd:Simple -> evt:Done
```
<!-- eventlanes-diagram -->
![Event Lanes Diagram](https://scr.eventlanes.app/scr/MYWwJgXAygliAOAbApgAgLQD5XIG4BcIARAewDtkg/002850017be8dc6e8c11bb1e329687054dc19fafb87d08693cf6844872f1f7c8)
<!-- /eventlanes-diagram -->
