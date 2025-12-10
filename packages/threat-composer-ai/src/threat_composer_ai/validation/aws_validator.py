"""AWS Bedrock credential validation for threat-composer-ai."""

import boto3
from botocore.exceptions import (
    BotoCoreError,
    ClientError,
    NoCredentialsError,
    PartialCredentialsError,
    ProfileNotFound,
)
from strands import Agent

from ..agents.common import create_agent_model
from ..config import AppConfig
from ..logging import log_debug, log_error, log_success, log_warning


def get_aws_credential_info(config: AppConfig) -> dict[str, str]:
    """Get AWS credential type and identity information.

    Args:
        config: Application configuration containing AWS settings

    Returns:
        dict with keys: credential_type, arn, account_id, user_id
    """
    try:
        # Create session with profile if specified
        if config.aws_profile:
            session = boto3.Session(
                profile_name=config.aws_profile, region_name=config.aws_region
            )
        else:
            session = boto3.Session(region_name=config.aws_region)

        sts = session.client("sts")
        identity = sts.get_caller_identity()

        arn = identity["Arn"]

        # Determine credential type from ARN
        if ":user/" in arn:
            cred_type = "IAM User"
        elif ":assumed-role/" in arn:
            role_name = arn.split("/")[-2]
            cred_type = f"Assumed Role ({role_name})"
        elif ":role/" in arn:
            cred_type = "IAM Role"
        elif ":federated-user/" in arn:
            cred_type = "Federated User"
        else:
            cred_type = "Unknown"

        return {
            "credential_type": cred_type,
            "arn": arn,
            "account_id": identity["Account"],
            "user_id": identity["UserId"],
        }
    except Exception as e:
        log_debug(f"Could not determine credential type: {e}")
        return {
            "credential_type": "Unknown",
            "arn": "N/A",
            "account_id": "N/A",
            "user_id": "N/A",
        }


def validate_aws_bedrock_inference(config: AppConfig) -> bool:
    """ """
    try:
        agent = Agent(
            system_prompt="You like pineapple on your pizza.",
            model=create_agent_model("test", config),
            callback_handler=None,
        )
        agent("Testing...")
        log_success("Inference validated successfully")
        return True

    except Exception as e:
        log_error(f"Inference validation failed: {str(e)}")
        return False


def validate_aws_bedrock_access(config: AppConfig) -> bool:
    """
    Validate AWS Bedrock access by listing foundation models.

    Args:
        config: Application configuration containing AWS settings

    Returns:
        bool: True if validation successful, False otherwise

    Raises:
        SystemExit: If validation fails with actionable error message
    """
    log_debug("Starting AWS Bedrock credential validation")

    try:
        # Create Bedrock client with configuration
        log_debug(f"Creating Bedrock client for region: {config.aws_region}")

        # Create session with profile if specified
        if config.aws_profile:
            session = boto3.Session(
                profile_name=config.aws_profile, region_name=config.aws_region
            )
            bedrock_client = session.client(
                "bedrock",
                config=config.create_boto_config(),
            )
        else:
            bedrock_client = boto3.client(
                "bedrock",
                region_name=config.aws_region,
                config=config.create_boto_config(),
            )

        # Test with list foundation models to validate credentials and access
        log_debug("Testing AWS credentials by listing foundation models")

        # Make the test call
        bedrock_client.list_foundation_models()

        # If we get here, the call was successful
        # Get credential information
        cred_info = get_aws_credential_info(config)

        log_success("AWS Bedrock credentials validated successfully")
        log_success(
            f"Credential type: {cred_info['credential_type']} on AWS Account: {cred_info['account_id']}"
        )
        if config.aws_profile:
            log_success(f"Using profile: {config.aws_profile}")
        log_success(f"Region access confirmed: {config.aws_region}")

        return True

    except NoCredentialsError:
        log_error("AWS credentials not found")
        log_error("Please configure AWS credentials using one of these methods:")
        log_error(
            "  1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)"
        )
        log_error("  2. AWS CLI: aws configure")
        log_error("  3. IAM roles (if running on AWS infrastructure)")
        raise SystemExit(1) from None

    except PartialCredentialsError as e:
        log_error(f"Incomplete AWS credentials: {e}")
        log_error("Please ensure all required credential components are provided")
        raise SystemExit(1) from e

    except ProfileNotFound as e:
        log_error(f"AWS profile not found: {e}")
        log_error("Please check your AWS configuration or use environment variables")
        raise SystemExit(1) from e

    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        error_message = e.response.get("Error", {}).get("Message", str(e))

        if error_code == "UnauthorizedOperation":
            log_error("AWS credentials lack sufficient permissions for Bedrock")
            log_error("Required permissions:")
            log_error("  - bedrock:InvokeModel")
            log_error(f"  - Access to model: {config.aws_model_id}")
            log_error(
                "Please contact your AWS administrator to grant these permissions"
            )

        elif error_code == "ValidationException":
            if "model" in error_message.lower():
                log_error(f"Model validation failed: {config.aws_model_id}")
                log_error("Please check:")
                log_error("  1. Model ID is correct")
                log_error("  2. Model is available in your region")
                log_error("  3. You have access to the model")
            else:
                log_error(f"Request validation failed: {error_message}")

        elif error_code == "ResourceNotFoundException":
            log_error(f"Model not found: {config.aws_model_id}")
            log_error(
                f"Please verify the model is available in region: {config.aws_region}"
            )
            log_error("You may need to request model access in the AWS Bedrock console")

        elif error_code == "AccessDeniedException":
            log_error("Access denied to AWS Bedrock")
            log_error("This could be due to:")
            log_error("  1. Insufficient IAM permissions")
            log_error("  2. Model not enabled in your account")
            log_error("  3. Regional restrictions")
            log_error("")
            log_error("Please check AWS Bedrock console for model access requests")

        elif error_code == "ThrottlingException":
            log_warning("AWS Bedrock request was throttled during validation")
            log_warning("This is normal and indicates your credentials work")
            log_success("Credential validation successful (throttled but authorized)")
            return True

        else:
            log_error(f"AWS Bedrock error ({error_code}): {error_message}")

        raise SystemExit(1) from None

    except BotoCoreError as e:
        log_error(f"AWS connection error: {e}")
        log_error("This could be due to:")
        log_error("  1. Network connectivity issues")
        log_error("  2. Invalid region configuration")
        log_error("  3. AWS service availability")
        log_error("")
        log_error(
            f"Please check your network connection and region: {config.aws_region}"
        )
        raise SystemExit(1) from e

    except Exception as e:
        log_error(f"Unexpected error during AWS validation: {e}")
        log_error("Please check your configuration and try again")
        raise SystemExit(1) from e


def get_aws_troubleshooting_info(config: AppConfig) -> str:
    """
    Get troubleshooting information for AWS setup.

    Args:
        config: Application configuration

    Returns:
        str: Formatted troubleshooting information
    """
    troubleshooting = f"""
AWS Bedrock Configuration Troubleshooting:

Current Configuration:
  - Region: {config.aws_region}
  - Model: {config.aws_model_id}
  - Credentials: Will be tested during validation

Common Issues:
1. Missing Credentials:
   - Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables
   - Or run: aws configure

2. Insufficient Permissions:
   - Ensure your IAM user/role has bedrock:InvokeModel permission
   - Check AWS Bedrock console for model access requests

3. Model Access:
   - Visit AWS Bedrock console and request access to Claude models
   - Ensure the model is available in your selected region

4. Regional Availability:
   - Bedrock is not available in all regions
   - Try regions like us-east-1, us-west-2, eu-west-1

5. Network Issues:
   - Check internet connectivity
   - Verify corporate firewall settings
   - Ensure AWS endpoints are accessible

For more help, visit: https://docs.aws.amazon.com/bedrock/latest/userguide/
"""
    return troubleshooting
